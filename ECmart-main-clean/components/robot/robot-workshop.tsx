"use client"

import { useEffect, useState } from "react"
import { RobotCharacter, type RobotRenderMode } from "./robot-character"
import { RobotAvatar } from "./robot-avatar"
import type { RobotBase, RobotConfig, SavedRobot } from "@/lib/types"
import { useAccount } from "@/lib/account-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ROBOT_BASE_OPTIONS, ROBOT_ITEM_OPTIONS, ROBOT_POSE_OPTIONS, ROBOT_VIEW_OPTIONS } from "@/lib/robot-parts"
import {
  Check,
  Database,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Shuffle,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react"

const ROBOT_DRAFT_KEY = "machinowa:robot-draft"

const BODY_COLORS = [
  { label: "アルミ", value: "#d1d1d1" },
  { label: "しろがね", value: "#eceeef" },
  { label: "くろがね", value: "#8d9194" },
  { label: "レンガ", value: "#e8842f" },
  { label: "しんちゅう", value: "#c9a24b" },
  { label: "あおがね", value: "#5b8c9c" },
  { label: "もえぎ", value: "#7ba05b" },
  { label: "うすべに", value: "#d98aa0" },
  { label: "はがね", value: "#8a8f96" },
]

const ACCENT_COLORS = [
  { label: "黒", value: "#111111" },
  { label: "濃いグレー", value: "#777777" },
  { label: "さくら", value: "#e86a8f" },
  { label: "たまご", value: "#ffcf4d" },
  { label: "みずいろ", value: "#5fb6d1" },
  { label: "わかば", value: "#6fbf73" },
  { label: "だいだい", value: "#f08a3c" },
]

const BASES = ROBOT_BASE_OPTIONS
const POSES = ROBOT_POSE_OPTIONS
const ITEMS = ROBOT_ITEM_OPTIONS
const VIEWS = ROBOT_VIEW_OPTIONS

const DEFAULT_CONFIG: RobotConfig = {
  base: "volta",
  size: 55,
  bodyColor: "#d1d1d1",
  accentColor: "#111111",
  pose: "cheer",
  item: "none",
  view: "front",
  name: "ボルタ",
}

type Notice = { type: "success" | "error"; text: string } | null

function OptionPicker<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Button
          key={o.value}
          type="button"
          size="sm"
          variant={value === o.value ? "default" : "outline"}
          onClick={() => onChange(o.value)}
          className="rounded-full"
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}

function Swatches({
  colors,
  value,
  onChange,
}: {
  colors: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {colors.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          aria-label={c.label}
          aria-pressed={value === c.value}
          onClick={() => onChange(c.value)}
          className={cn(
            "size-9 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            value === c.value
              ? "border-foreground ring-2 ring-ring ring-offset-2 ring-offset-background"
              : "border-black/10",
          )}
          style={{ backgroundColor: c.value }}
        />
      ))}
    </div>
  )
}

function dispatchNavigate(tab: "account" | "robot") {
  window.dispatchEvent(new CustomEvent("machinowa:navigate", { detail: { tab } }))
}

export function RobotWorkshop() {
  const account = useAccount()
  const [config, setConfig] = useState<RobotConfig>(DEFAULT_CONFIG)
  const [editingRobotId, setEditingRobotId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [desktop3D, setDesktop3D] = useState(false)
  const [previewMode, setPreviewMode] = useState<RobotRenderMode>("2d")

  useEffect(() => {
    const media = window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)")
    const sync = () => {
      setDesktop3D(media.matches)
      if (!media.matches) setPreviewMode("2d")
    }
    sync()
    media.addEventListener?.("change", sync)
    return () => media.removeEventListener?.("change", sync)
  }, [])

  useEffect(() => {
    const rawDraft = window.sessionStorage.getItem(ROBOT_DRAFT_KEY)
    if (!rawDraft) return

    window.sessionStorage.removeItem(ROBOT_DRAFT_KEY)
    try {
      const draft = JSON.parse(rawDraft) as { id?: string; config?: RobotConfig }
      if (draft.config) {
        setConfig(draft.config)
        setEditingRobotId(draft.id ?? null)
        setNotice({ type: "success", text: "保存したロボットを工房に読み込みました。" })
      }
    } catch {
      setNotice({ type: "error", text: "保存したロボットの読み込みに失敗しました。" })
    }
  }, [])

  function update<K extends keyof RobotConfig>(key: K, val: RobotConfig[K]) {
    setConfig((current) => ({ ...current, [key]: val }))
  }

  function chooseBase(base: RobotBase) {
    setConfig((current) => {
      const wasDefaultName = current.name === "ボルタ" || current.name === "ナッティ"
      return {
        ...current,
        base,
        name: wasDefaultName ? (base === "volta" ? "ボルタ" : "ナッティ") : current.name,
      }
    })
  }

  function randomize() {
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
    setConfig((current) => ({
      ...current,
      base: pick(BASES).value,
      bodyColor: pick(BODY_COLORS).value,
      accentColor: pick(ACCENT_COLORS).value,
      pose: pick(POSES).value,
      item: pick(ITEMS).value,
      size: 35 + Math.floor(Math.random() * 55),
    }))
    setEditingRobotId(null)
    setNotice(null)
  }

  function startNewRobot() {
    setConfig(DEFAULT_CONFIG)
    setEditingRobotId(null)
    setNotice(null)
  }

  function loadRobot(robot: SavedRobot) {
    setConfig(robot.config)
    setEditingRobotId(robot.id)
    setNotice({ type: "success", text: `${robot.name}を工房に読み込みました。` })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function saveCurrentRobot(asNew = false) {
    setNotice(null)

    if (!account.user) {
      setNotice({ type: "error", text: "保存するにはログインしてください。" })
      dispatchNavigate("account")
      return
    }

    setSubmitting(true)
    const result = await account.saveRobot(config, asNew ? undefined : editingRobotId ?? undefined)
    setSubmitting(false)

    if (result.error) {
      setNotice({ type: "error", text: result.error })
      return
    }

    if (result.robot) setEditingRobotId(result.robot.id)
    setNotice({
      type: "success",
      text: asNew || !editingRobotId ? "ロボットをアカウントへ保存しました。" : "変更を上書き保存しました。",
    })
  }

  async function setAsAvatar(robotId: string) {
    setSubmitting(true)
    const result = await account.setAvatarRobot(robotId)
    setSubmitting(false)
    setNotice(
      result.error
        ? { type: "error", text: result.error }
        : { type: "success", text: "アカウントアイコンに設定しました。" },
    )
  }

  async function removeRobot(robot: SavedRobot) {
    if (!window.confirm(`${robot.name}を削除しますか？`)) return

    setSubmitting(true)
    const result = await account.deleteRobot(robot.id)
    setSubmitting(false)

    if (!result.error && editingRobotId === robot.id) {
      setEditingRobotId(null)
    }
    setNotice(
      result.error
        ? { type: "error", text: result.error }
        : { type: "success", text: `${robot.name}を削除しました。` },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            notice.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800",
          )}
          role="status"
        >
          {notice.text}
        </div>
      )}

      {!account.robotStorageReady && account.user && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <Database className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-bold">Supabaseの追加SQLが必要です</p>
              <p className="mt-1">
                プロジェクト内の <code>supabase/robot-storage-migration.sql</code> をSQL Editorで実行してください。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <Card className="overflow-hidden border-2 lg:sticky lg:top-24 lg:self-start">
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <Sparkles className="size-5 text-primary" />
              プレビュー
            </CardTitle>
            <div className="flex items-center gap-2">
              {editingRobotId && <Badge className="rounded-full">編集中</Badge>}
              <Badge variant="secondary" className="rounded-full">
                {config.base === "volta" ? "ボルタ型" : "ナッティ型"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl bg-[radial-gradient(circle_at_50%_35%,var(--color-secondary),var(--color-muted))] p-4">
              <div className="mx-auto flex aspect-square max-w-sm items-center justify-center">
                <RobotCharacter
                  config={config}
                  interactive={previewMode === "3d"}
                  mode={previewMode}
                  on3DUnavailable={() => {
                    setPreviewMode("2d")
                    setNotice({ type: "error", text: "このPCでは3D表示を開始できなかったため、2D表示に戻しました。" })
                  }}
                  className="h-full w-full transition-all"
                />
              </div>
              <div className="mx-auto -mt-2 w-fit rounded-full border bg-background/90 px-4 py-1 font-display text-sm font-bold shadow-sm">
                {config.name || (config.base === "volta" ? "ボルタ" : "ナッティ")}
              </div>
            </div>
            <div className="mt-4 flex flex-col items-center gap-3">
              {desktop3D ? (
                <div className="flex items-center gap-2 rounded-full border bg-muted/40 p-1">
                  <Button size="sm" variant={previewMode === "2d" ? "default" : "ghost"} className="rounded-full" onClick={() => setPreviewMode("2d")}>2D</Button>
                  <Button size="sm" variant={previewMode === "3d" ? "default" : "ghost"} className="rounded-full" onClick={() => setPreviewMode("3d")}>3D</Button>
                </div>
              ) : (
                <Badge variant="secondary" className="rounded-full">スマホ・タブレットは2D表示</Badge>
              )}
              <div className="flex items-center justify-center gap-2">
              {VIEWS.map((v) => (
                <Button
                  key={v.value}
                  size="sm"
                  variant={config.view === v.value ? "default" : "outline"}
                  onClick={() => update("view", v.value)}
                  className="rounded-full"
                >
                  {v.label}
                </Button>
              ))}
              </div>
            </div>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {previewMode === "3d" ? "PC限定3D：ドラッグで回転、ホイールで拡大縮小できます" : "2Dはアイコンと同じ正式表示。正面・側面・背面を切り替えられます"}
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="font-display text-base">お名前をつけよう</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="robot-name">名前</Label>
                <Input
                  id="robot-name"
                  value={config.name}
                  maxLength={40}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="れい：ボルタ"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>タイプ</Label>
                <div className="grid grid-cols-2 gap-3">
                  {BASES.map((base) => (
                    <button
                      key={base.value}
                      type="button"
                      onClick={() => chooseBase(base.value)}
                      className={cn(
                        "rounded-xl border-2 p-3 text-left transition-colors",
                        config.base === base.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <div className="font-display font-bold">{base.label}</div>
                      <div className="text-xs text-muted-foreground">{base.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="font-display text-base">見た目を調整</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label>大きさ</Label>
                  <span className="text-sm text-muted-foreground">{config.size} cm</span>
                </div>
                <Slider
                  value={[config.size]}
                  min={20}
                  max={90}
                  step={1}
                  onValueChange={(value) =>
                    update("size", Array.isArray(value) ? value[0] : (value as number))
                  }
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label>ボディの色</Label>
                <Swatches
                  colors={BODY_COLORS}
                  value={config.bodyColor}
                  onChange={(value) => update("bodyColor", value)}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label>アクセントの色</Label>
                <Swatches
                  colors={ACCENT_COLORS}
                  value={config.accentColor}
                  onChange={(value) => update("accentColor", value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="font-display text-base">ポーズと持ちもの</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Label>ポーズ</Label>
                <OptionPicker options={POSES} value={config.pose} onChange={(value) => update("pose", value)} />
              </div>
              <div className="flex flex-col gap-3">
                <Label>持たせるモノ</Label>
                <OptionPicker options={ITEMS} value={config.item} onChange={(value) => update("item", value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-5">
              <div>
                <h3 className="font-display font-black">アカウントへ保存</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  保存すると、別の端末でも呼び出せ、アカウントアイコンにも設定できます。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void saveCurrentRobot(false)}
                  className="rounded-full"
                  disabled={submitting || (Boolean(account.user) && !account.robotStorageReady)}
                >
                  {submitting ? (
                    <LoaderCircle className="animate-spin" data-icon="inline-start" />
                  ) : account.user ? (
                    <Save data-icon="inline-start" />
                  ) : (
                    <UserRound data-icon="inline-start" />
                  )}
                  {!account.user
                    ? "ログインして保存"
                    : editingRobotId
                      ? "変更を上書き保存"
                      : "このロボットを保存"}
                </Button>
                {editingRobotId && account.user && (
                  <Button
                    variant="outline"
                    onClick={() => void saveCurrentRobot(true)}
                    className="rounded-full"
                    disabled={submitting || !account.robotStorageReady}
                  >
                    <Plus data-icon="inline-start" />
                    新規として保存
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={randomize} className="rounded-full" variant="outline">
              <Shuffle data-icon="inline-start" />
              おまかせで作る
            </Button>
            <Button variant="outline" onClick={startNewRobot} className="rounded-full">
              <RotateCcw data-icon="inline-start" />
              新しく作る
            </Button>
          </div>
        </div>
      </div>

      {account.user && account.robotStorageReady && (
        <Card className="border-2">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="font-display text-xl">保存したロボット</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                読み込んで編集したり、アカウントアイコンに設定したりできます。
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full">
              {account.savedRobots.length}体
            </Badge>
          </CardHeader>
          <CardContent>
            {account.savedRobots.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {account.savedRobots.map((robot) => (
                  <div
                    key={robot.id}
                    className={cn(
                      "rounded-2xl border-2 bg-background p-4",
                      robot.is_avatar && "border-primary bg-primary/5",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <RobotAvatar config={robot.config} className="size-16" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display truncate font-black">{robot.name}</h3>
                          {robot.is_avatar && (
                            <Badge className="rounded-full">
                              <Check className="size-3" />
                              アイコン
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {robot.config.base === "volta" ? "ボルタ型" : "ナッティ型"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => loadRobot(robot)}>
                        <Pencil data-icon="inline-start" />
                        編集
                      </Button>
                      {!robot.is_avatar && (
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => void setAsAvatar(robot.id)}
                          disabled={submitting}
                        >
                          <UserRound data-icon="inline-start" />
                          アイコンにする
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full text-destructive hover:text-destructive"
                        onClick={() => void removeRobot(robot)}
                        disabled={submitting}
                      >
                        <Trash2 data-icon="inline-start" />
                        削除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed py-10 text-center text-muted-foreground">
                <Save className="size-8" />
                <p className="font-display font-bold text-foreground">まだ保存したロボットはいません</p>
                <p className="text-sm">上の「このロボットを保存」から最初の1体を保存してください。</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
