"use client"

import { useEffect, useMemo, useState } from "react"
import type { RobotConfig, RobotPose } from "@/lib/types"
import { useAccount } from "@/lib/account-context"
import { ROBOT_DRAFT_KEY, normalizeRobotConfig } from "@/lib/robot-config"
import { clearRobotPoseStudioDraft, loadRobotPoseStudioDraft, type RobotPoseStudioDraft } from "@/lib/robot-pose-studio"
import { clearCustomPose, normalizePoseState } from "@/lib/robot-pose-2d"
import { ROBOT_POSE_OPTIONS } from "@/lib/robot-parts"
import { normalizeRobotHeldItem } from "@/lib/robot-held-item"
import { RobotPoseEditor, type PoseHandleId } from "./robot-pose-editor"
import { RobotCharacter } from "./robot-character"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Check, RotateCcw, Sparkles } from "lucide-react"

function navigateRobot() {
  const url = new URL(window.location.href)
  url.searchParams.set("tab", "robot")
  window.location.assign(url.toString())
}

function poseLabel(pose: RobotPose) {
  return ROBOT_POSE_OPTIONS.find((entry) => entry.value === pose)?.label ?? pose
}

export function RobotPoseStudio() {
  const account = useAccount()
  const [config, setConfig] = useState<RobotConfig | null>(null)
  const [originalConfig, setOriginalConfig] = useState<RobotConfig | null>(null)
  const [editingRobotId, setEditingRobotId] = useState<string | null>(null)
  const [active, setActive] = useState<{ view: "front" | "side"; handle: PoseHandleId } | null>(null)

  useEffect(() => {
    const raw = loadRobotPoseStudioDraft()
    if (!raw) {
      navigateRobot()
      return
    }
    try {
      const draft = JSON.parse(raw) as RobotPoseStudioDraft
      const normalized = normalizeRobotConfig(draft.config)
      const poseState = normalizePoseState(normalized.pose, normalized.poseState)
      const next = { ...normalized, poseState: { ...poseState, mode: "custom" as const } }
      setConfig(next)
      setOriginalConfig(draft.originalConfig ? normalizeRobotConfig(draft.originalConfig) : normalized)
      setEditingRobotId(draft.editingRobotId ?? null)
    } catch {
      navigateRobot()
    }
  }, [])

  const customItemDocument = useMemo(() => {
    if (!config) return null
    const held = normalizeRobotHeldItem(config.heldItem, config.item)
    return held.kind === "custom"
      ? account.savedCustomItems.find((item) => item.id === held.customItemId)?.document ?? null
      : null
  }, [account.savedCustomItems, config])

  if (!config) {
    return <div className="flex min-h-[55vh] items-center justify-center text-sm text-muted-foreground">自由ポーズ編集を準備しています…</div>
  }

  const frontConfig: RobotConfig = { ...config, view: "front" }
  const sideConfig: RobotConfig = { ...config, view: "side" }
  const backConfig: RobotConfig = { ...config, view: "back" }

  function updatePoseState(nextPoseState: NonNullable<RobotConfig["poseState"]>) {
    setConfig((current) => current ? { ...current, pose: nextPoseState.preset, poseState: nextPoseState } : current)
  }

  function selectPreset(pose: RobotPose) {
    setConfig((current) => {
      if (!current) return current
      return {
        ...current,
        pose,
        poseState: clearCustomPose(pose),
      }
    })
    setActive(null)
  }

  function resetPose() {
    const preset = config.poseState?.preset ?? config.pose
    updatePoseState(clearCustomPose(preset))
    setActive(null)
  }

  function returnWith(nextConfig: RobotConfig, source: "pose-studio" | "pose-studio-cancel") {
    window.sessionStorage.setItem(
      ROBOT_DRAFT_KEY,
      JSON.stringify({ id: editingRobotId, config: nextConfig, source }),
    )
    clearRobotPoseStudioDraft()
    navigateRobot()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-bold text-primary">自由ポーズ専用画面</div>
          <h1 className="font-display mt-1 text-3xl font-black">正面と側面を見ながらポーズ編集</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            正面は左右方向、側面は前後方向を編集します。片方で関節を動かすと、もう片方のビューにも連動し、腕や脚の見え方が疑似3Dらしく変わります。たとえば正面で真横に伸ばした腕は、側面では短く見えるように補正されます。オレンジの点は操作中の同じ関節を示します。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => originalConfig && returnWith(originalConfig, "pose-studio-cancel")}>
            <ArrowLeft data-icon="inline-start" />
            変更せず戻る
          </Button>
          <Button type="button" className="rounded-full" onClick={() => returnWith(config, "pose-studio")}>
            <Check data-icon="inline-start" />
            このポーズを反映
          </Button>
        </div>
      </div>

      <Card className="border-2 border-primary/25 bg-primary/5">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full"><Sparkles className="mr-1 size-3" />基準ポーズ：{poseLabel(config.poseState?.preset ?? config.pose)}</Badge>
            <span className="text-xs text-muted-foreground">白い丸をドラッグして編集します。反対ビューも同期して動き、正面・側面を合わせた疑似3Dの見え方を確認できます。</span>
          </div>
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={resetPose}><RotateCcw data-icon="inline-start" />自由ポーズをリセット</Button>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden border-2">
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div><CardTitle className="font-display">正面</CardTitle><p className="mt-1 text-xs text-muted-foreground">腕・脚の左右への広がりを編集</p></div>
            <Badge variant="secondary" className="rounded-full">FRONT</Badge>
          </CardHeader>
          <CardContent>
            <div className="mx-auto aspect-square max-w-xl rounded-2xl bg-[radial-gradient(circle_at_50%_35%,var(--color-secondary),var(--color-muted))] p-2">
              <RobotPoseEditor
                config={frontConfig}
                enabled
                onPoseStateChange={updatePoseState}
                customItemDocument={customItemDocument}
                linkedGuide={active?.view === "side" ? { config: sideConfig, handle: active.handle } : null}
                onInteractionChange={(handle) => setActive(handle ? { view: "front", handle } : null)}
                className="h-full w-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-2">
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div><CardTitle className="font-display">側面</CardTitle><p className="mt-1 text-xs text-muted-foreground">腕・脚の前後方向を編集。奥側と手前側を別々に動かせます</p></div>
            <Badge variant="secondary" className="rounded-full">SIDE</Badge>
          </CardHeader>
          <CardContent>
            <div className="mx-auto aspect-square max-w-xl rounded-2xl bg-[radial-gradient(circle_at_50%_35%,var(--color-secondary),var(--color-muted))] p-2">
              <RobotPoseEditor
                config={sideConfig}
                enabled
                onPoseStateChange={updatePoseState}
                customItemDocument={customItemDocument}
                linkedGuide={active?.view === "front" ? { config: frontConfig, handle: active.handle } : null}
                onInteractionChange={(handle) => setActive(handle ? { view: "side", handle } : null)}
                className="h-full w-full"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="border-2">
          <CardHeader><CardTitle className="font-display text-base">基準ポーズを変更</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {ROBOT_POSE_OPTIONS.map((entry) => (
              <Button key={entry.value} type="button" size="sm" variant={(config.poseState?.preset ?? config.pose) === entry.value ? "default" : "outline"} className="rounded-full" onClick={() => selectPreset(entry.value)}>{entry.label}</Button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader><CardTitle className="font-display text-base">背面確認</CardTitle></CardHeader>
          <CardContent>
            <div className="aspect-square rounded-xl bg-muted"><RobotCharacter config={backConfig} customItemDocument={customItemDocument} className="h-full w-full" /></div>
            <p className="mt-2 text-xs text-muted-foreground">背面は正面と同じ左右軸を後ろから見た確認用です。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
