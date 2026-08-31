"use client"

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import type { DioramaDocument, SceneTransform } from "@/lib/creation-model"
import { useAccount } from "@/lib/account-context"
import {
  DIORAMA_DRAFT_KEY,
  DIORAMA_MAX_ITEMS,
  DIORAMA_EDITOR_ROBOT_LIMIT,
  createEmptyDioramaDocument,
  groundDioramaDocumentRobots,
  dioramaStageReferenceFor,
  newDioramaPlacementId,
  normalizeDioramaDocument,
  sanitizeDioramaName,
  snapDioramaRobotTransform,
  stageIdFromReference,
} from "@/lib/diorama-model"
import { getDioramaStage, unlockedDioramaStages } from "@/lib/diorama-stages"
import { DioramaScenePreview, type DioramaSelection } from "./diorama-scene"
import { DioramaStagePreview } from "./diorama-stage-preview"
import { RobotAvatar } from "@/components/robot/robot-avatar"
import { CustomItemPreview } from "@/components/workbench/custom-item-preview"
import { normalizeRobotHeldItem } from "@/lib/robot-held-item"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Copy,
  Database,
  Image as ImageIcon,
  Layers3,
  LoaderCircle,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react"

type Notice = { type: "success" | "error"; text: string } | null

type DragState = {
  selection: DioramaSelection
  offsetX: number
  offsetY: number
}

function dispatchNavigate(tab: "account" | "robot" | "gacha") {
  window.dispatchEvent(new CustomEvent("machinowa:navigate", { detail: { tab } }))
}

function copyTransform(transform: SceneTransform): SceneTransform {
  return {
    position: [...transform.position],
    rotationDeg: [...transform.rotationDeg],
    scale: [...transform.scale],
  }
}

function defaultTransform(index: number, kind: "robot" | "item", stageId: string): SceneTransform {
  const x = ((index % 5) - 2) * 70
  const y = kind === "robot" ? 65 + (Math.floor(index / 5) % 2) * 35 : 95 + (Math.floor(index / 5) % 2) * 30
  const scale = kind === "robot" ? 0.78 : 0.72
  const transform: SceneTransform = {
    position: [x, y, 10 + index],
    rotationDeg: [0, 0, 0],
    scale: [scale, scale, scale],
  }
  return kind === "robot" ? snapDioramaRobotTransform(stageId, transform) : transform
}

export function DioramaWorkshop() {
  const account = useAccount()
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [document, setDocument] = useState<DioramaDocument>(() => createEmptyDioramaDocument())
  const [editingDioramaId, setEditingDioramaId] = useState<string | null>(null)
  const [selected, setSelected] = useState<DioramaSelection | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  const unlockedStages = useMemo(() => unlockedDioramaStages(account.gachaInventory), [account.gachaInventory])
  const currentStageId = stageIdFromReference(document.stage)
  const currentStage = getDioramaStage(currentStageId)

  const selectedPlacement = useMemo(() => {
    if (!selected) return null
    return selected.kind === "robot"
      ? document.robots.find((entry) => entry.placementId === selected.placementId) ?? null
      : document.items.find((entry) => entry.placementId === selected.placementId) ?? null
  }, [document.items, document.robots, selected])

  const selectedLabel = useMemo(() => {
    if (!selected) return null
    if (selected.kind === "robot") {
      const placement = document.robots.find((entry) => entry.placementId === selected.placementId)
      return account.savedRobots.find((entry) => entry.id === placement?.savedRobotId)?.name ?? "ロボット"
    }
    const placement = document.items.find((entry) => entry.placementId === selected.placementId)
    return account.savedCustomItems.find((entry) => entry.id === placement?.customItemId)?.name ?? "自作アイテム"
  }, [account.savedCustomItems, account.savedRobots, document.items, document.robots, selected])

  useEffect(() => {
    const raw = window.sessionStorage.getItem(DIORAMA_DRAFT_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { id?: string; document?: unknown; stageId?: string }
      if (parsed.document) {
        window.sessionStorage.removeItem(DIORAMA_DRAFT_KEY)
        setDocument(groundDioramaDocumentRobots(normalizeDioramaDocument(parsed.document)))
        setEditingDioramaId(parsed.id ?? null)
        setNotice({ type: "success", text: "保存したジオラマを読み込みました。" })
        return
      }
      if (parsed.stageId) {
        const stage = unlockedStages.find((candidate) => candidate.id === parsed.stageId)
        if (!stage) return
        window.sessionStorage.removeItem(DIORAMA_DRAFT_KEY)
        setDocument((current) => groundDioramaDocumentRobots({ ...current, stage: dioramaStageReferenceFor(stage) }))
        return
      }
      window.sessionStorage.removeItem(DIORAMA_DRAFT_KEY)
    } catch {
      window.sessionStorage.removeItem(DIORAMA_DRAFT_KEY)
      setNotice({ type: "error", text: "ジオラマの読み込みに失敗しました。" })
    }
  }, [unlockedStages])

  useEffect(() => {
    if (!drag) return
    function move(event: PointerEvent) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = ((event.clientX - rect.left) / rect.width) * 640 - 320 - drag.offsetX
      const y = ((event.clientY - rect.top) / rect.height) * 360 - 180 - drag.offsetY
      updatePlacementTransform(drag.selection, (transform) => ({
        ...transform,
        position: [Math.max(-305, Math.min(305, x)), Math.max(-165, Math.min(165, y)), transform.position[2]],
      }))
    }
    function up() { setDrag(null) }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up, { once: true })
    window.addEventListener("pointercancel", up, { once: true })
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
  }, [drag])

  function updatePlacementTransform(selection: DioramaSelection, updater: (transform: SceneTransform) => SceneTransform) {
    setDocument((current) => selection.kind === "robot"
      ? { ...current, robots: current.robots.map((entry) => entry.placementId === selection.placementId ? { ...entry, transform: snapDioramaRobotTransform(stageIdFromReference(current.stage), updater(entry.transform)) } : entry) }
      : { ...current, items: current.items.map((entry) => entry.placementId === selection.placementId ? { ...entry, transform: updater(entry.transform) } : entry) })
  }

  function startDrag(selection: DioramaSelection, event: ReactPointerEvent<HTMLButtonElement>) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    event.preventDefault()
    event.stopPropagation()
    setSelected(selection)
    const placement = selection.kind === "robot"
      ? document.robots.find((entry) => entry.placementId === selection.placementId)
      : document.items.find((entry) => entry.placementId === selection.placementId)
    if (!placement) return
    const pointerX = ((event.clientX - rect.left) / rect.width) * 640 - 320
    const pointerY = ((event.clientY - rect.top) / rect.height) * 360 - 180
    setDrag({ selection, offsetX: pointerX - placement.transform.position[0], offsetY: pointerY - placement.transform.position[1] })
  }

  function addRobot(savedRobotId: string) {
    if (document.robots.length >= DIORAMA_EDITOR_ROBOT_LIMIT) {
      setNotice({ type: "error", text: `見やすさを保つため、ロボットは1つのジオラマに${DIORAMA_EDITOR_ROBOT_LIMIT}体まで配置できます。` })
      return
    }
    const placementId = newDioramaPlacementId("robot")
    setDocument((current) => ({
      ...current,
      robots: [...current.robots, { placementId, savedRobotId, transform: defaultTransform(current.robots.length + current.items.length, "robot", stageIdFromReference(current.stage)) }],
    }))
    setSelected({ kind: "robot", placementId })
  }

  function addItem(customItemId: string) {
    if (document.items.length >= DIORAMA_MAX_ITEMS) {
      setNotice({ type: "error", text: `自作アイテムは1つのジオラマに最大${DIORAMA_MAX_ITEMS}個まで配置できます。` })
      return
    }
    const placementId = newDioramaPlacementId("item")
    setDocument((current) => ({
      ...current,
      items: [...current.items, { placementId, customItemId, transform: defaultTransform(current.robots.length + current.items.length, "item", stageIdFromReference(current.stage)) }],
    }))
    setSelected({ kind: "item", placementId })
  }

  function removeSelected() {
    if (!selected) return
    setDocument((current) => selected.kind === "robot"
      ? { ...current, robots: current.robots.filter((entry) => entry.placementId !== selected.placementId) }
      : { ...current, items: current.items.filter((entry) => entry.placementId !== selected.placementId) })
    setSelected(null)
  }

  function duplicateSelected() {
    if (!selected || !selectedPlacement) return
    if (selected.kind === "robot") {
      const source = document.robots.find((entry) => entry.placementId === selected.placementId)
      if (!source || document.robots.length >= DIORAMA_EDITOR_ROBOT_LIMIT) return
      const placementId = newDioramaPlacementId("robot")
      const transform = copyTransform(source.transform)
      transform.position = [Math.min(305, transform.position[0] + 28), transform.position[1], Math.min(100, transform.position[2] + 1)]
      const grounded = snapDioramaRobotTransform(currentStageId, transform)
      setDocument((current) => ({ ...current, robots: [...current.robots, { ...source, placementId, transform: grounded }] }))
      setSelected({ kind: "robot", placementId })
    } else {
      const source = document.items.find((entry) => entry.placementId === selected.placementId)
      if (!source || document.items.length >= DIORAMA_MAX_ITEMS) return
      const placementId = newDioramaPlacementId("item")
      const transform = copyTransform(source.transform)
      transform.position = [Math.min(305, transform.position[0] + 28), Math.min(165, transform.position[1] + 20), Math.min(100, transform.position[2] + 1)]
      setDocument((current) => ({ ...current, items: [...current.items, { ...source, placementId, transform }] }))
      setSelected({ kind: "item", placementId })
    }
  }

  function moveLayer(delta: number) {
    if (!selected) return
    updatePlacementTransform(selected, (transform) => ({
      ...transform,
      position: [transform.position[0], transform.position[1], Math.max(0, Math.min(100, transform.position[2] + delta))],
    }))
  }

  function chooseStage(stageId: string) {
    const stage = unlockedStages.find((entry) => entry.id === stageId)
    if (!stage) return
    setDocument((current) => groundDioramaDocumentRobots({ ...current, stage: dioramaStageReferenceFor(stage) }))
  }

  function resetScene() {
    if ((document.robots.length || document.items.length) && !window.confirm("配置中のロボットとアイテムをすべて消して、新しいジオラマにしますか？")) return
    setDocument(createEmptyDioramaDocument())
    setEditingDioramaId(null)
    setSelected(null)
    setNotice(null)
  }

  async function saveCurrent(asNew = false) {
    setNotice(null)
    if (!account.user) {
      setNotice({ type: "error", text: "ジオラマを保存するにはログインしてください。" })
      dispatchNavigate("account")
      return
    }
    const clean = normalizeDioramaDocument({ ...document, name: sanitizeDioramaName(document.name) })
    if (clean.robots.length === 0 && clean.items.length === 0) {
      setNotice({ type: "error", text: "ロボットまたは自作アイテムを1つ以上配置してください。" })
      return
    }
    setSubmitting(true)
    const result = await account.saveDiorama(clean, asNew ? undefined : editingDioramaId ?? undefined)
    setSubmitting(false)
    if (result.error) {
      setNotice({ type: "error", text: result.error })
      return
    }
    if (result.diorama) setEditingDioramaId(result.diorama.id)
    setDocument(clean)
    setNotice({ type: "success", text: asNew || !editingDioramaId ? "ジオラマをマイページへ保存しました。" : "ジオラマを上書き保存しました。" })
  }

  const selectedRotation = selectedPlacement?.transform.rotationDeg[2] ?? 0
  const selectedScale = selectedPlacement?.transform.scale[0] ?? 1

  return (
    <div className="flex flex-col gap-6">
      {notice && <div role="status" className={cn("rounded-xl border px-4 py-3 text-sm", notice.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800")}>{notice.text}</div>}

      {!account.dioramaStorageReady && account.user && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-2"><Database className="mt-0.5 size-4" /><div><p className="font-bold">ジオラマ保存用のSupabase設定が必要です</p><p className="mt-1"><code>supabase/dioramas-migration.sql</code> をSQL Editorで実行してください。</p></div></div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        <div className="flex flex-col gap-5">
          <Card className="border-2">
            <CardHeader><CardTitle className="font-display flex items-center gap-2 text-base"><MapPin className="size-5 text-primary" />ステージ</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {unlockedStages.map((stage) => (
                <button key={stage.id} type="button" onClick={() => chooseStage(stage.id)} className={cn("overflow-hidden rounded-xl border-2 text-left transition-colors", currentStageId === stage.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
                  <DioramaStagePreview stageId={stage.id} className="aspect-[16/7] w-full rounded-none" />
                </button>
              ))}
              <Button type="button" variant="outline" className="rounded-full" onClick={() => dispatchNavigate("gacha")}><Plus data-icon="inline-start" />背景をガチャで集める</Button>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader><CardTitle className="font-display flex items-center gap-2 text-base"><Bot className="size-5 text-primary" />マイロボット</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {account.savedRobots.length ? account.savedRobots.map((robot) => {
                const held = normalizeRobotHeldItem(robot.config.heldItem, robot.config.item)
                const custom = held.kind === "custom" ? account.savedCustomItems.find((item) => item.id === held.customItemId)?.document ?? null : null
                return <button key={robot.id} type="button" onClick={() => addRobot(robot.id)} className="flex items-center gap-3 rounded-xl border p-2 text-left hover:border-primary hover:bg-primary/5"><RobotAvatar config={robot.config} customItemDocument={custom} className="size-12" /><div className="min-w-0"><div className="truncate font-display text-sm font-black">{robot.name}</div><div className="text-[11px] text-muted-foreground">クリックで配置</div></div></button>
              }) : <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">保存ロボットがありません</div>}
              <Button type="button" variant="outline" className="rounded-full" onClick={() => dispatchNavigate("robot")}><Plus data-icon="inline-start" />ロボットを作る</Button>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader><CardTitle className="font-display flex items-center gap-2 text-base"><Wrench className="size-5 text-primary" />自作アイテム</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {account.savedCustomItems.length ? account.savedCustomItems.map((item) => <button key={item.id} type="button" onClick={() => addItem(item.id)} className="overflow-hidden rounded-xl border text-left hover:border-primary"><CustomItemPreview document={item.document} className="aspect-square w-full rounded-none" /><div className="truncate px-2 py-1.5 text-xs font-bold">{item.name}</div></button>) : <div className="col-span-2 rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">自作アイテムがありません</div>}
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden border-2 xl:sticky xl:top-24 xl:self-start">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div><CardTitle className="font-display flex items-center gap-2"><ImageIcon className="size-5 text-primary" />ジオラマ編集</CardTitle><p className="mt-1 text-sm text-muted-foreground">{currentStage?.emoji} {currentStage?.label ?? "ステージ"} ・ ドラッグして配置</p></div>
            <div className="flex gap-2"><Badge variant="secondary" className="rounded-full">{document.robots.length}体</Badge><Badge variant="secondary" className="rounded-full">{document.items.length}個</Badge></div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div ref={canvasRef}><DioramaScenePreview document={document} robots={account.savedRobots} customItems={account.savedCustomItems} selected={selected} onSelect={setSelected} onPointerDown={startDrag} /></div>
            <div className="rounded-xl border bg-muted/35 p-3 text-xs text-muted-foreground">ロボットは見やすさを優先して最大5体。移動すると地面や対応する建物・橋の上へ自動で接地します。アイテムは自由配置できます。</div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="border-2">
            <CardHeader><CardTitle className="font-display text-base">作品設定</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2"><Label htmlFor="diorama-name">ジオラマ名</Label><Input id="diorama-name" value={document.name} maxLength={40} onChange={(event) => setDocument((current) => ({ ...current, name: event.target.value }))} /></div>
              <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" className="rounded-full" onClick={resetScene}><RotateCcw data-icon="inline-start" />新しく作る</Button></div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader><CardTitle className="font-display flex items-center gap-2 text-base"><Layers3 className="size-5 text-primary" />選択中</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-5">
              {selected && selectedPlacement ? <>
                <div><Badge className="rounded-full">{selected.kind === "robot" ? "ロボット" : "自作アイテム"}</Badge><div className="font-display mt-2 text-lg font-black">{selectedLabel}</div></div>
                <div className="flex flex-col gap-2"><div className="flex justify-between text-sm"><Label>回転</Label><span>{Math.round(selectedRotation)}°</span></div><Slider value={[selectedRotation]} min={-180} max={180} step={1} onValueChange={(value) => updatePlacementTransform(selected, (transform) => ({ ...transform, rotationDeg: [0, 0, Array.isArray(value) ? value[0] : (value as number)] }))} /></div>
                <div className="flex flex-col gap-2"><div className="flex justify-between text-sm"><Label>大きさ</Label><span>{Math.round(selectedScale * 100)}%</span></div><Slider value={[selectedScale]} min={0.25} max={2.5} step={0.05} onValueChange={(value) => { const scale = Array.isArray(value) ? value[0] : (value as number); updatePlacementTransform(selected, (transform) => ({ ...transform, scale: [scale, scale, scale] })) }} /></div>
                <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => moveLayer(5)}><ArrowUp data-icon="inline-start" />手前へ</Button><Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => moveLayer(-5)}><ArrowDown data-icon="inline-start" />奥へ</Button></div>
                <Button type="button" variant="outline" className="rounded-full" onClick={duplicateSelected}><Copy data-icon="inline-start" />複製</Button>
                <Button type="button" variant="ghost" className="rounded-full text-destructive hover:text-destructive" onClick={removeSelected}><Trash2 data-icon="inline-start" />配置から削除</Button>
              </> : <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">キャンバス上のロボットまたはアイテムを選択してください。</div>}
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-5">
              <div><h3 className="font-display font-black">マイページへ保存</h3><p className="mt-1 text-sm text-muted-foreground">背景・配置・回転・大きさ・前後関係をまとめて保存します。</p></div>
              <Button type="button" className="rounded-full" onClick={() => void saveCurrent(false)} disabled={submitting || (Boolean(account.user) && !account.dioramaStorageReady)}>{submitting ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : account.user ? <Save data-icon="inline-start" /> : <UserRound data-icon="inline-start" />}{!account.user ? "ログインして保存" : editingDioramaId ? "変更を上書き保存" : "このジオラマを保存"}</Button>
              {editingDioramaId && account.user && <Button type="button" variant="outline" className="rounded-full" onClick={() => void saveCurrent(true)} disabled={submitting || !account.dioramaStorageReady}><Plus data-icon="inline-start" />新規として保存</Button>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
