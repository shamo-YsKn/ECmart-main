"use client"

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { useAccount } from "@/lib/account-context"
import type { CustomItemDocument, CustomItemPartPlacement, WorkbenchPartType } from "@/lib/creation-model"
import {
  CUSTOM_ITEM_DRAFT_KEY,
  CUSTOM_ITEM_MAX_PARTS,
  createEmptyCustomItemDocument,
  newWorkbenchInstanceId,
  normalizeCustomItemDocument,
  sanitizeCustomItemName,
} from "@/lib/custom-item-model"
import { WORKBENCH_PARTS, WORKBENCH_PART_BY_TYPE } from "@/lib/workbench-parts"
import { WorkbenchPartShape } from "./workbench-part-shape"
import { CustomItemPreview } from "./custom-item-preview"
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
  Copy,
  Hammer,
  Layers3,
  LoaderCircle,
  Move,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UserRound,
} from "lucide-react"

type Notice = { type: "success" | "error"; text: string } | null

type DragState = {
  pointerId: number
  instanceId: string
  offsetX: number
  offsetY: number
}

const VIEWBOX = { minX: -300, minY: -220, width: 600, height: 440 }

function dispatchNavigate(tab: "account" | "robot") {
  window.dispatchEvent(new CustomEvent("machinowa:navigate", { detail: { tab } }))
}

function newPart(type: WorkbenchPartType, index: number): CustomItemPartPlacement {
  const spread = ((index % 7) - 3) * 12
  return {
    instanceId: newWorkbenchInstanceId(),
    partType: type,
    transform: {
      position: [spread, ((Math.floor(index / 7) % 5) - 2) * 12, 0],
      rotationDeg: [0, 0, 0],
      scale: [1, 1, 1],
    },
  }
}

function PartPalettePreview({ type }: { type: WorkbenchPartType }) {
  return (
    <svg viewBox="-75 -60 150 120" className="size-16" aria-hidden="true">
      <g transform="scale(.72)">
        <WorkbenchPartShape type={type} />
      </g>
    </svg>
  )
}

export function CustomItemWorkshop() {
  const account = useAccount()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [document, setDocument] = useState<CustomItemDocument>(() => createEmptyCustomItemDocument())
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  const selectedPart = useMemo(
    () => document.parts.find((part) => part.instanceId === selectedId) ?? null,
    [document.parts, selectedId],
  )

  useEffect(() => {
    const raw = window.sessionStorage.getItem(CUSTOM_ITEM_DRAFT_KEY)
    if (!raw) return
    window.sessionStorage.removeItem(CUSTOM_ITEM_DRAFT_KEY)
    try {
      const parsed = JSON.parse(raw) as { id?: string; document?: unknown }
      if (!parsed.document) return
      const next = normalizeCustomItemDocument(parsed.document)
      setDocument(next)
      setEditingItemId(parsed.id ?? null)
      setSelectedId(next.parts.at(-1)?.instanceId ?? null)
      setNotice({ type: "success", text: "保存したアイテムを工作台に読み込みました。" })
    } catch {
      setNotice({ type: "error", text: "保存したアイテムの読み込みに失敗しました。" })
    }
  }, [])

  function pointerToWorkbench(clientX: number, clientY: number) {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const p = svg.createSVGPoint()
    p.x = clientX
    p.y = clientY
    const local = p.matrixTransform(ctm.inverse())
    return {
      x: Math.max(VIEWBOX.minX + 12, Math.min(VIEWBOX.minX + VIEWBOX.width - 12, local.x)),
      y: Math.max(VIEWBOX.minY + 12, Math.min(VIEWBOX.minY + VIEWBOX.height - 12, local.y)),
    }
  }

  function patchSelected(mutator: (part: CustomItemPartPlacement) => CustomItemPartPlacement) {
    if (!selectedId) return
    setDocument((current) => ({
      ...current,
      parts: current.parts.map((part) => part.instanceId === selectedId ? mutator(part) : part),
    }))
  }

  function addPart(type: WorkbenchPartType) {
    if (document.parts.length >= CUSTOM_ITEM_MAX_PARTS) {
      setNotice({ type: "error", text: `1つのアイテムには最大${CUSTOM_ITEM_MAX_PARTS}個まで配置できます。` })
      return
    }
    const part = newPart(type, document.parts.length)
    setDocument((current) => ({ ...current, parts: [...current.parts, part] }))
    setSelectedId(part.instanceId)
    setNotice(null)
  }

  function startDrag(event: ReactPointerEvent<SVGGElement>, part: CustomItemPartPlacement) {
    const point = pointerToWorkbench(event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedId(part.instanceId)
    setDrag({
      pointerId: event.pointerId,
      instanceId: part.instanceId,
      offsetX: point.x - part.transform.position[0],
      offsetY: point.y - part.transform.position[1],
    })
    svgRef.current?.setPointerCapture(event.pointerId)
  }

  function moveDrag(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drag || drag.pointerId !== event.pointerId) return
    const point = pointerToWorkbench(event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    setDocument((current) => ({
      ...current,
      parts: current.parts.map((part) => part.instanceId === drag.instanceId
        ? {
            ...part,
            transform: {
              ...part.transform,
              position: [point.x - drag.offsetX, point.y - drag.offsetY, part.transform.position[2]],
            },
          }
        : part),
    }))
  }

  function endDrag(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drag || drag.pointerId !== event.pointerId) return
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId)
    setDrag(null)
  }

  function removeSelected() {
    if (!selectedId) return
    setDocument((current) => ({ ...current, parts: current.parts.filter((part) => part.instanceId !== selectedId) }))
    setSelectedId(null)
  }

  function duplicateSelected() {
    if (!selectedPart || document.parts.length >= CUSTOM_ITEM_MAX_PARTS) return
    const copy: CustomItemPartPlacement = {
      ...selectedPart,
      instanceId: newWorkbenchInstanceId(),
      transform: {
        ...selectedPart.transform,
        position: [selectedPart.transform.position[0] + 20, selectedPart.transform.position[1] + 20, selectedPart.transform.position[2]],
        rotationDeg: [...selectedPart.transform.rotationDeg],
        scale: [...selectedPart.transform.scale],
      },
    }
    setDocument((current) => ({ ...current, parts: [...current.parts, copy] }))
    setSelectedId(copy.instanceId)
  }

  function moveLayer(direction: "up" | "down") {
    if (!selectedId) return
    setDocument((current) => {
      const index = current.parts.findIndex((part) => part.instanceId === selectedId)
      if (index < 0) return current
      const target = direction === "up" ? index + 1 : index - 1
      if (target < 0 || target >= current.parts.length) return current
      const parts = [...current.parts]
      ;[parts[index], parts[target]] = [parts[target], parts[index]]
      return { ...current, parts }
    })
  }

  function resetWorkbench() {
    if (document.parts.length > 0 && !window.confirm("工作台を空にして、新しいアイテムを作りますか？")) return
    setDocument(createEmptyCustomItemDocument())
    setEditingItemId(null)
    setSelectedId(null)
    setNotice(null)
  }

  async function save(asNew = false) {
    setNotice(null)
    if (!account.user) {
      setNotice({ type: "error", text: "アイテムを保存するにはログインしてください。" })
      dispatchNavigate("account")
      return
    }
    if (!account.customItemStorageReady) {
      setNotice({ type: "error", text: account.customItemStorageError ?? "アイテム保存用のSupabase設定が必要です。" })
      return
    }
    if (document.parts.length === 0) {
      setNotice({ type: "error", text: "工作部品を1つ以上配置してください。" })
      return
    }

    const name = sanitizeCustomItemName(document.name)
    const cleanDocument = normalizeCustomItemDocument({ ...document, name }, name)
    setSubmitting(true)
    const result = await account.saveCustomItem(cleanDocument, asNew ? undefined : editingItemId ?? undefined)
    setSubmitting(false)
    if (result.error) {
      setNotice({ type: "error", text: result.error })
      return
    }
    setDocument(cleanDocument)
    if (result.item) setEditingItemId(result.item.id)
    setNotice({
      type: "success",
      text: asNew || !editingItemId ? "自作アイテムをアカウントへ保存しました。" : "自作アイテムを上書き保存しました。",
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <div className={cn("rounded-xl border px-4 py-3 text-sm", notice.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800")} role="status">
          {notice.text}
        </div>
      )}

      {account.user && !account.customItemStorageReady && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-bold">アイテム保存用のSupabase SQLが必要です</p>
          <p className="mt-1"><code>supabase/custom-items-migration.sql</code> をSQL Editorで1回実行してください。</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[270px_minmax(0,1fr)_290px]">
        <Card className="border-2 xl:sticky xl:top-24 xl:self-start">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-lg"><Hammer className="size-5 text-primary" />工作パーツ</CardTitle>
            <p className="text-sm text-muted-foreground">クリックすると工作台の中央へ追加します。</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 xl:grid-cols-1">
            {WORKBENCH_PARTS.map((part) => (
              <button key={part.type} type="button" onClick={() => addPart(part.type)} className="flex items-center gap-2 rounded-xl border p-2 text-left transition-colors hover:border-primary hover:bg-primary/5">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f4ead6]"><PartPalettePreview type={part.type} /></div>
                <div className="min-w-0">
                  <div className="font-display text-sm font-black">{part.shortLabel}</div>
                  <div className="text-[11px] text-muted-foreground">{part.category}</div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="overflow-hidden border-2">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="font-display flex items-center gap-2 text-lg"><Move className="size-5 text-primary" />工作台</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">部品をドラッグして自由に配置できます。</p>
              </div>
              <Badge variant="secondary" className="rounded-full">{document.parts.length}/{CUSTOM_ITEM_MAX_PARTS}パーツ</Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-2xl border-2 border-dashed border-[#b9a98c] bg-[#f4ead6] shadow-inner">
                <svg
                  ref={svgRef}
                  viewBox={`${VIEWBOX.minX} ${VIEWBOX.minY} ${VIEWBOX.width} ${VIEWBOX.height}`}
                  className="aspect-[4/3] w-full touch-none select-none"
                  preserveAspectRatio="xMidYMid meet"
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onPointerDown={(event) => {
                    if (event.target === event.currentTarget) setSelectedId(null)
                  }}
                >
                  <g stroke="#7c6851" strokeOpacity=".12" strokeWidth="1">
                    {Array.from({ length: 13 }, (_, i) => <line key={`v-${i}`} x1={-300 + i * 50} y1="-220" x2={-300 + i * 50} y2="220" />)}
                    {Array.from({ length: 9 }, (_, i) => <line key={`h-${i}`} x1="-300" y1={-200 + i * 50} x2="300" y2={-200 + i * 50} />)}
                  </g>
                  <line x1="-280" y1="0" x2="280" y2="0" stroke="#7c6851" strokeOpacity=".16" strokeDasharray="6 8" />
                  <line x1="0" y1="-205" x2="0" y2="205" stroke="#7c6851" strokeOpacity=".16" strokeDasharray="6 8" />
                  {document.parts.map((part) => (
                    <g
                      key={part.instanceId}
                      transform={`translate(${part.transform.position[0]} ${part.transform.position[1]}) rotate(${part.transform.rotationDeg[2]}) scale(${part.transform.scale[0]})`}
                      onPointerDown={(event) => startDrag(event, part)}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <rect x="-70" y="-58" width="140" height="116" rx="12" fill="transparent" />
                      <WorkbenchPartShape type={part.partType} selected={part.instanceId === selectedId} />
                    </g>
                  ))}
                  {document.parts.length === 0 && (
                    <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="#7c6851" fontSize="18" fontWeight="700">左のパーツを追加して工作を始めよう</text>
                  )}
                </svg>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>ドラッグ：移動　／　右のパネル：回転・大きさ・重なり順</span>
                <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setSelectedId(null)}>選択解除</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/25 bg-primary/5">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="custom-item-name">作品名</Label>
                <Input id="custom-item-name" value={document.name} maxLength={40} onChange={(event) => setDocument((current) => ({ ...current, name: event.target.value }))} className="mt-2" placeholder="れい：LED花束" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" className="rounded-full" onClick={() => void save(false)} disabled={submitting || (Boolean(account.user) && !account.customItemStorageReady)}>
                  {submitting ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : account.user ? <Save data-icon="inline-start" /> : <UserRound data-icon="inline-start" />}
                  {!account.user ? "ログインして保存" : editingItemId ? "上書き保存" : "保存する"}
                </Button>
                {editingItemId && account.user && (
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => void save(true)} disabled={submitting || !account.customItemStorageReady}>
                    <Plus data-icon="inline-start" />別作品として保存
                  </Button>
                )}
                <Button type="button" variant="outline" className="rounded-full" onClick={resetWorkbench}><RotateCcw data-icon="inline-start" />新しく作る</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 xl:sticky xl:top-24 xl:self-start">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-lg"><Layers3 className="size-5 text-primary" />選択パーツ</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {selectedPart ? (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
                  <div className="flex size-16 items-center justify-center rounded-lg bg-[#f4ead6]"><PartPalettePreview type={selectedPart.partType} /></div>
                  <div><div className="font-display font-black">{WORKBENCH_PART_BY_TYPE[selectedPart.partType].label}</div><p className="mt-1 text-xs text-muted-foreground">{WORKBENCH_PART_BY_TYPE[selectedPart.partType].description}</p></div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between"><Label>回転</Label><span className="text-sm tabular-nums text-muted-foreground">{Math.round(selectedPart.transform.rotationDeg[2])}°</span></div>
                  <Slider value={[selectedPart.transform.rotationDeg[2]]} min={-180} max={180} step={1} onValueChange={(value) => {
                    const rotation = Array.isArray(value) ? value[0] : (value as number)
                    patchSelected((part) => ({ ...part, transform: { ...part.transform, rotationDeg: [0, 0, rotation] } }))
                  }} />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between"><Label>大きさ</Label><span className="text-sm tabular-nums text-muted-foreground">{Math.round(selectedPart.transform.scale[0] * 100)}%</span></div>
                  <Slider value={[selectedPart.transform.scale[0]]} min={0.4} max={2.5} step={0.05} onValueChange={(value) => {
                    const scale = Array.isArray(value) ? value[0] : (value as number)
                    patchSelected((part) => ({ ...part, transform: { ...part.transform, scale: [scale, scale, scale] } }))
                  }} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => moveLayer("up")}><ArrowUp data-icon="inline-start" />手前へ</Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => moveLayer("down")}><ArrowDown data-icon="inline-start" />奥へ</Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={duplicateSelected}><Copy data-icon="inline-start" />複製</Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-full text-destructive hover:text-destructive" onClick={removeSelected}><Trash2 data-icon="inline-start" />削除</Button>
                </div>

                <div className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                  位置：X {Math.round(selectedPart.transform.position[0])} / Y {Math.round(selectedPart.transform.position[1])}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">工作台のパーツを選択すると、ここで回転・大きさ・重なり順を調整できます。</div>
            )}

            <div className="border-t pt-4">
              <div className="mb-2 text-sm font-bold">完成イメージ</div>
              <CustomItemPreview document={document} className="aspect-square w-full border" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
