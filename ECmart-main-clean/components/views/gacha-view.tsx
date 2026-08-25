"use client"

import { useMemo, useState } from "react"
import { useAccount } from "@/lib/account-context"
import {
  GACHA_CATEGORY_LABELS,
  GACHA_COST,
  GACHA_RARITY_LABELS,
  getGachaReward,
  rewardPreview,
} from "@/lib/gacha"
import type { GachaSpinResult } from "@/lib/types"
import { getDioramaStage } from "@/lib/diorama-stages"
import { DioramaStagePreview } from "@/components/diorama/diorama-stage-preview"
import { DIORAMA_DRAFT_KEY } from "@/lib/diorama-model"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, Gift, Hammer, Layers3, LoaderCircle, LockKeyhole, RotateCcw, Sparkles, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"

function createRollId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    const value = character === "x" ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

type Phase = "intro" | "ready" | "spinning" | "result"

export function GachaView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const account = useAccount()
  const [phase, setPhase] = useState<Phase>("intro")
  const [rollId, setRollId] = useState("")
  const [result, setResult] = useState<GachaSpinResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reward = useMemo(
    () => (result ? getGachaReward(result.rewardId) : null),
    [result],
  )

  function prepareSpin() {
    setError(null)
    setResult(null)
    if (!account.user) {
      onNavigate("account")
      return
    }
    if ((account.profile?.points ?? 0) < GACHA_COST) {
      setError(`ポイントが足りません。ガチャ1回には${GACHA_COST}pt必要です。`)
      return
    }
    setRollId(createRollId())
    setPhase("ready")
  }

  async function reveal() {
    if (phase === "spinning") return
    const currentRollId = rollId || createRollId()
    if (!rollId) setRollId(currentRollId)
    setError(null)
    setPhase("spinning")

    const startedAt = Date.now()
    const spinPromise = account.spinGacha(currentRollId)
    const minimumAnimation = new Promise<void>((resolve) => window.setTimeout(resolve, 1100))
    const [spinResponse] = await Promise.all([spinPromise, minimumAnimation])

    if (spinResponse.error || !spinResponse.spin) {
      setError(spinResponse.error || "ガチャ結果を取得できませんでした。")
      setPhase("ready")
      return
    }

    // Keep a deterministic minimum animation even on very fast local networks.
    if (Date.now() - startedAt < 1000) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1000 - (Date.now() - startedAt)))
    }
    setResult(spinResponse.spin)
    setPhase("result")
  }

  function reset() {
    setResult(null)
    setRollId("")
    setError(null)
    setPhase("intro")
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-7" />
        </div>
        <h1 className="font-display mt-3 text-3xl font-black">ボルタ・ナッティ ガチャ</h1>
        <p className="mt-2 text-muted-foreground">
          カラー、持ちもの、工作素材、室蘭ジオラマ背景を獲得できます。
        </p>
      </div>

      <div className="mx-auto flex items-center gap-2 rounded-full border-2 bg-background px-5 py-2 font-bold shadow-sm">
        <Coins className="size-5 text-primary" />
        保有ポイント
        <span className="font-display text-xl font-black text-primary">
          {(account.profile?.points ?? 0).toLocaleString()} pt
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {!account.user ? (
        <Card className="border-2 text-center">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <LockKeyhole className="size-10 text-muted-foreground" />
            <div>
              <h2 className="font-display text-xl font-black">ログインが必要です</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                ガチャのポイントと獲得アイテムはアカウントに保存されます。
              </p>
            </div>
            <Button className="rounded-full" onClick={() => onNavigate("account")}>ログインする</Button>
          </CardContent>
        </Card>
      ) : phase === "intro" ? (
        <Card className="overflow-hidden border-2">
          <CardContent className="flex flex-col items-center gap-6 bg-[radial-gradient(circle_at_50%_20%,var(--color-secondary),var(--color-muted))] py-12 text-center">
            <div className="relative flex size-40 items-center justify-center rounded-[2rem] border-4 border-primary/25 bg-background/90 shadow-xl">
              <Gift className="size-20 text-primary" />
              <Sparkles className="absolute -right-3 -top-3 size-10 animate-pulse text-primary" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-black">1回 {GACHA_COST}pt</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                重複した景品は所持数として加算されます。特殊工作素材は一度獲得すれば何度でも工作に使えます。
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Badge variant="secondary" className="rounded-full">カラー</Badge>
                <Badge variant="secondary" className="rounded-full">持ちもの</Badge>
                <Badge variant="secondary" className="rounded-full">工作素材</Badge>
                <Badge variant="secondary" className="rounded-full">室蘭ジオラマ</Badge>
              </div>
            </div>
            <Button size="lg" className="rounded-full px-10" onClick={prepareSpin}>
              <Sparkles data-icon="inline-start" />
              1回まわす
            </Button>
          </CardContent>
        </Card>
      ) : phase === "ready" || phase === "spinning" ? (
        <Card className="overflow-hidden border-2">
          <CardContent className="flex min-h-[25rem] flex-col items-center justify-center gap-7 bg-[radial-gradient(circle_at_50%_45%,var(--color-primary)/18%,var(--color-muted))] p-8 text-center">
            <p className="font-display text-xl font-black">
              {phase === "spinning" ? "抽選中…" : "箱をクリックして開けよう！"}
            </p>
            <button
              type="button"
              onClick={() => void reveal()}
              disabled={phase === "spinning"}
              className={cn(
                "relative flex size-52 items-center justify-center rounded-[2.5rem] border-4 border-primary bg-background shadow-2xl transition-transform",
                phase === "ready" && "hover:scale-105 active:scale-95",
                phase === "spinning" && "animate-bounce cursor-wait",
              )}
              aria-label="ガチャを開ける"
            >
              {phase === "spinning" ? (
                <LoaderCircle className="size-24 animate-spin text-primary" />
              ) : (
                <>
                  <Gift className="size-28 text-primary" />
                  <span className="absolute inset-x-0 bottom-5 text-sm font-black text-primary">CLICK!</span>
                </>
              )}
            </button>
            <p className="text-sm text-muted-foreground">
              クリックした時点で{GACHA_COST}ptを消費します。
            </p>
          </CardContent>
        </Card>
      ) : result && reward ? (
        <Card className="overflow-hidden border-2">
          <CardHeader className="items-center text-center">
            <Badge className={cn(
              "rounded-full",
              reward.rarity === "special" && "bg-amber-500",
              reward.rarity === "rare" && "bg-violet-500",
            )}>
              {GACHA_RARITY_LABELS[reward.rarity]}
            </Badge>
            <CardTitle className="font-display text-3xl">{result.duplicate ? "また会えた！" : "新しい景品を獲得！"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pb-10 text-center">
            {reward.category === "diorama_stage" && getDioramaStage(reward.value) ? (
              <DioramaStagePreview stageId={reward.value} className="aspect-video w-full max-w-lg rounded-[2rem] border-4 shadow-xl" />
            ) : (
              <div className="flex size-52 items-center justify-center rounded-[2.5rem] border-4 bg-[radial-gradient(circle_at_35%_25%,white,var(--color-secondary))] shadow-xl">
                {rewardPreview(reward).kind === "color" ? (
                  <div
                    className="size-28 rounded-full border-4 border-white shadow-lg ring-2 ring-foreground/15"
                    style={{ backgroundColor: reward.value }}
                  />
                ) : (
                  <span className="text-8xl">{rewardPreview(reward).icon}</span>
                )}
              </div>
            )}
            <div>
              <div className="text-sm font-bold text-muted-foreground">{GACHA_CATEGORY_LABELS[reward.category]}</div>
              <h2 className="font-display mt-1 text-3xl font-black">{reward.label}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                所持数：{result.quantity}個
                {result.duplicate && "（重複）"}
              </p>
            </div>
            <div className="rounded-2xl bg-primary/10 px-6 py-3 font-bold text-primary">
              残り {result.pointsBalance.toLocaleString()} pt
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" className="rounded-full" onClick={reset}>
                <RotateCcw data-icon="inline-start" />
                もう一度
              </Button>
              {reward.category === "workbench_part" ? (
                <Button className="rounded-full" onClick={() => onNavigate("workbench")}>
                  <Hammer data-icon="inline-start" />
                  工作台で使う
                </Button>
              ) : reward.category === "diorama_stage" ? (
                <Button className="rounded-full" onClick={() => { window.sessionStorage.setItem(DIORAMA_DRAFT_KEY, JSON.stringify({ stageId: reward.value })); onNavigate("diorama") }}>
                  <Layers3 data-icon="inline-start" />
                  この背景で作る
                </Button>
              ) : (
                <Button className="rounded-full" onClick={() => onNavigate("robot")}>
                  <Wrench data-icon="inline-start" />
                  工房で使う
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
