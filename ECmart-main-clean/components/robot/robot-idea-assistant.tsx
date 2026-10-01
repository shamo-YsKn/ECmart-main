"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROBOT_BASE_PARTS, ROBOT_ITEM_PARTS, ROBOT_POSE_PARTS, ROBOT_VIEW_PARTS } from "@/lib/robot-parts"
import { estimateCustomItemPrice, estimateRobotReferencePrice, formatReferencePrice, ROBOT_BASE_REFERENCE_PRICE } from "@/lib/price-estimator"
import {
  EXTERNAL_AI_PROVIDER_CONFIGURED,
  ROBOT_IDEA_AI_PREFERENCE_KEY,
  suggestRobotIdeas,
  type RobotIdeaCandidate,
  type RobotIdeaColorOption,
  type RobotIdeaResult,
} from "@/lib/robot-idea-engine"
import type { RobotConfig, RobotItem } from "@/lib/types"
import { CUSTOM_ITEM_DRAFT_KEY } from "@/lib/custom-item-model"
import { ROBOT_DRAFT_KEY } from "@/lib/robot-config"
import { Hammer, Sparkles } from "lucide-react"

const EXAMPLES = [
  "釣りをしている楽しそうなボルタ",
  "室蘭の工場を案内するナッティ",
  "花を持って手を振るボルタ",
  "ギターを演奏するナッティ",
]

export function RobotIdeaAssistant({
  currentConfig,
  availableItems,
  availableBodyColors,
  availableAccentColors,
  onApply,
}: {
  currentConfig: RobotConfig
  availableItems: readonly RobotItem[]
  availableBodyColors: readonly RobotIdeaColorOption[]
  availableAccentColors: readonly RobotIdeaColorOption[]
  onApply: (candidate: RobotIdeaCandidate) => void
}) {
  const [input, setInput] = useState("")
  const [result, setResult] = useState<RobotIdeaResult | null>(null)
  const [aiEnabled, setAiEnabled] = useState(false)

  useEffect(() => {
    setAiEnabled(window.localStorage.getItem(ROBOT_IDEA_AI_PREFERENCE_KEY) === "1")
  }, [])

  function updateAiPreference(next: boolean) {
    setAiEnabled(next)
    window.localStorage.setItem(ROBOT_IDEA_AI_PREFERENCE_KEY, next ? "1" : "0")
  }

  function generate(value = input) {
    const text = value.trim()
    if (!text) return
    setInput(text)
    setResult(suggestRobotIdeas(text, {
      currentConfig,
      availableItems,
      availableBodyColors,
      availableAccentColors,
      requestedProvider: aiEnabled ? "external" : "rules",
    }))
  }

  const pricedCandidates = useMemo(
    () => result?.candidates.map((candidate) => {
      const itemEstimate = candidate.customItemProposal
        ? estimateCustomItemPrice(candidate.customItemProposal.document)
        : null
      const basePrice = estimateRobotReferencePrice(candidate.config).total
      return {
        candidate,
        itemEstimate,
        price: candidate.customItemProposal
          ? ROBOT_BASE_REFERENCE_PRICE[candidate.config.base] + (itemEstimate?.surcharge ?? 0)
          : basePrice,
      }
    }) ?? [],
    [result],
  )

  function openProposalInWorkbench(candidate: RobotIdeaCandidate) {
    const proposal = candidate.customItemProposal
    if (!proposal) return
    // 工房へ戻るときに候補ロボットも復元できるよう、同じタブのsessionStorageへ退避。
    window.sessionStorage.setItem(
      ROBOT_DRAFT_KEY,
      JSON.stringify({ config: candidate.config, source: "idea-assistant-workbench" }),
    )
    window.sessionStorage.setItem(
      CUSTOM_ITEM_DRAFT_KEY,
      JSON.stringify({ document: proposal.document, source: "idea-assistant", query: result?.query ?? "" }),
    )
    onApply(candidate)
    window.dispatchEvent(new CustomEvent("machinowa:navigate", { detail: { tab: "workbench" } }))
  }

  return (
    <Card className="border-2 border-primary/20 bg-primary/[0.025]">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-primary" />
            イメージからボルタ・ナッティを提案
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">⑤-1〜⑤-5</Badge>
            <Button
              type="button"
              size="sm"
              variant={aiEnabled ? "default" : "outline"}
              className="rounded-full"
              onClick={() => updateAiPreference(!aiEnabled)}
              aria-pressed={aiEnabled}
            >
              AI接続 {aiEnabled ? "ON" : "OFF"}
            </Button>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          作りたいイメージを文章で入力すると、現在使える部品・色・ポーズだけで3案に変換します。外部APIへの通信は現在行いません。
        </p>
        {aiEnabled && !EXTERNAL_AI_PROVIDER_CONFIGURED && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            AI接続はON設定ですが、接続先はまだ未設定です。現在は自動的にルールベース提案へフォールバックします。
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="robot-idea-input" className="text-sm font-bold">作りたいイメージ</label>
          <textarea
            id="robot-idea-input"
            value={input}
            maxLength={240}
            rows={3}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") generate()
            }}
            placeholder="例：釣りをしている楽しそうなボルタ。右手に釣竿を持たせたい"
            className="min-h-24 w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => generate(example)}
                className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                {example}
              </button>
            ))}
          </div>
          <Button type="button" onClick={() => generate()} disabled={!input.trim()} className="mt-1 sm:self-start">
            <Sparkles className="mr-2 size-4" />3案を提案する
          </Button>
        </div>

        {result && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="rounded-full">使用エンジン：ルールベース</Badge>
              {result.matchedThemeIds.length > 0 && <span>認識テーマ {result.matchedThemeIds.length}件</span>}
              {result.fallbackReason && <span className="text-amber-800">{result.fallbackReason}</span>}
            </div>
            <div className="grid gap-3 xl:grid-cols-3">
              {pricedCandidates.map(({ candidate, price, itemEstimate }, index) => (
                <div key={candidate.id} className="flex flex-col rounded-2xl border bg-background p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-primary">案{String.fromCharCode(65 + index)}・{candidate.themeLabel}</div>
                      <h3 className="mt-1 font-display text-base font-black">{candidate.title}</h3>
                    </div>
                    <Badge variant="secondary" className="shrink-0 rounded-full">{formatReferencePrice(price)}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{candidate.summary}</p>
                  <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
                    <div className="rounded-lg bg-muted px-2 py-1.5">{ROBOT_BASE_PARTS[candidate.config.base].label}</div>
                    <div className="rounded-lg bg-muted px-2 py-1.5">{ROBOT_POSE_PARTS[candidate.config.pose].label}</div>
                    <div className="rounded-lg bg-muted px-2 py-1.5">{ROBOT_ITEM_PARTS[candidate.config.item].label}</div>
                    <div className="rounded-lg bg-muted px-2 py-1.5">{ROBOT_VIEW_PARTS[candidate.config.view].label}</div>
                  </div>
                  {candidate.customItemProposal ? (
                    <div className="mt-3 rounded-xl border border-primary/25 bg-primary/[0.035] p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-foreground">工作案：{candidate.customItemProposal.title}</strong>
                        {itemEstimate && <Badge variant="outline" className="rounded-full">{itemEstimate.tierLabel}</Badge>}
                      </div>
                      <p className="mt-1 leading-relaxed text-muted-foreground">{candidate.customItemProposal.summary}</p>
                      {itemEstimate && (
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span>{itemEstimate.features.partCount}パーツ</span>
                          <span>{itemEstimate.features.uniquePartTypeCount}種類</span>
                          <span>工作スコア {itemEstimate.score}</span>
                          <span>工作加算 {formatReferencePrice(itemEstimate.surcharge)}</span>
                        </div>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full rounded-full"
                        onClick={() => openProposalInWorkbench(candidate)}
                      >
                        <Hammer className="mr-2 size-4" />工作台へ読み込む
                      </Button>
                    </div>
                  ) : candidate.futureCustomItemHint ? (
                    <div className="mt-3 rounded-lg border border-dashed px-2.5 py-2 text-xs text-muted-foreground">
                      自作アイテム候補：<strong className="text-foreground">{candidate.futureCustomItemHint}</strong><br />現在のルールには工作テンプレートがないため、工作台で手動作成してください。
                    </div>
                  ) : null}
                  <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                    {candidate.reasons.slice(0, 2).map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                  <Button type="button" className="mt-4 w-full" onClick={() => onApply(candidate)}>
                    この案で作る
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              ※表示価格は現在の価格モデルによる参考価格です。工作案がある候補は、その自作アイテムを装備した場合の工作Tier加算も含みます。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
