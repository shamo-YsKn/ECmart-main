"use client"

import { useState } from "react"
import { RobotCharacter } from "./robot-character"
import type {
  RobotBase,
  RobotConfig,
  RobotItem,
  RobotPose,
  RobotView,
} from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { RotateCcw, Sparkles, Shuffle } from "lucide-react"

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

const BASES: { value: RobotBase; label: string; sub: string }[] = [
  { value: "volta", label: "ボルタ", sub: "細いボルト脚のタイプ" },
  { value: "natty", label: "ナッティ", sub: "大きなナット腰のタイプ" },
]

const POSES: { value: RobotPose; label: string }[] = [
  { value: "stand", label: "きをつけ" },
  { value: "wave", label: "おて振り" },
  { value: "cheer", label: "ばんざい" },
  { value: "point", label: "ゆびさし" },
]

const ITEMS: { value: RobotItem; label: string }[] = [
  { value: "none", label: "なし" },
  { value: "wrench", label: "スパナ" },
  { value: "gear", label: "歯車" },
  { value: "flower", label: "お花" },
  { value: "heart", label: "ハート" },
]

const VIEWS: { value: RobotView; label: string }[] = [
  { value: "front", label: "正面" },
  { value: "side", label: "側面" },
  { value: "back", label: "背面" },
]

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

export function RobotWorkshop() {
  const [config, setConfig] = useState<RobotConfig>(DEFAULT_CONFIG)

  function update<K extends keyof RobotConfig>(key: K, val: RobotConfig[K]) {
    setConfig((c) => ({ ...c, [key]: val }))
  }

  function randomize() {
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
    setConfig((c) => ({
      ...c,
      base: pick(BASES).value,
      bodyColor: pick(BODY_COLORS).value,
      accentColor: pick(ACCENT_COLORS).value,
      pose: pick(POSES).value,
      item: pick(ITEMS).value,
      size: 35 + Math.floor(Math.random() * 55),
    }))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* プレビュー */}
      <Card className="overflow-hidden border-2 lg:sticky lg:top-24 lg:self-start">
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-primary" />
            プレビュー
          </CardTitle>
          <Badge variant="secondary" className="rounded-full">
            {config.base === "volta" ? "ボルタ型" : "ナッティ型"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl bg-[radial-gradient(circle_at_50%_35%,var(--color-secondary),var(--color-muted))] p-4">
            <div className="mx-auto flex aspect-square max-w-sm items-center justify-center">
              <RobotCharacter
                config={config}
                className="h-full w-full transition-all"
                key="preview"
              />
            </div>
            <div className="mx-auto -mt-2 w-fit rounded-full border bg-background/90 px-4 py-1 font-display text-sm font-bold shadow-sm">
              {config.name || (config.base === "volta" ? "ボルタ" : "ナッティ")}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
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
          <p className="mt-3 text-center text-sm text-muted-foreground">
            視点を切り替えると、くるっと向きが変わります
          </p>
        </CardContent>
      </Card>

      {/* コントロール */}
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
                maxLength={12}
                onChange={(e) => update("name", e.target.value)}
                placeholder="れい：ボルタ"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>タイプ</Label>
              <div className="grid grid-cols-2 gap-3">
                {BASES.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => update("base", b.value)}
                    className={cn(
                      "rounded-xl border-2 p-3 text-left transition-colors",
                      config.base === b.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <div className="font-display font-bold">{b.label}</div>
                    <div className="text-xs text-muted-foreground">{b.sub}</div>
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
                onValueChange={(v) =>
                  update("size", Array.isArray(v) ? v[0] : (v as number))
                }
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label>ボディの色</Label>
              <Swatches
                colors={BODY_COLORS}
                value={config.bodyColor}
                onChange={(v) => update("bodyColor", v)}
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label>アクセントの色</Label>
              <Swatches
                colors={ACCENT_COLORS}
                value={config.accentColor}
                onChange={(v) => update("accentColor", v)}
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
              <OptionPicker
                options={POSES}
                value={config.pose}
                onChange={(v) => update("pose", v)}
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label>持たせるモノ</Label>
              <OptionPicker
                options={ITEMS}
                value={config.item}
                onChange={(v) => update("item", v)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button onClick={randomize} className="rounded-full">
            <Shuffle data-icon="inline-start" />
            おまかせで作る
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfig(DEFAULT_CONFIG)}
            className="rounded-full"
          >
            <RotateCcw data-icon="inline-start" />
            リセット
          </Button>
        </div>
      </div>
    </div>
  )
}
