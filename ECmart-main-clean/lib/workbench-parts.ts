import type { WorkbenchPartType } from "@/lib/creation-model"

export interface WorkbenchPartDefinition {
  type: WorkbenchPartType
  label: string
  shortLabel: string
  category: "金属部品" | "線材" | "LED"
  description: string
}

export const WORKBENCH_PARTS: WorkbenchPartDefinition[] = [
  { type: "hex_nut", label: "六角ナット", shortLabel: "ナット", category: "金属部品", description: "ボルタらしい基本パーツ。中心に穴があります。" },
  { type: "washer", label: "ワッシャー", shortLabel: "座金", category: "金属部品", description: "薄い円形の金属パーツです。" },
  { type: "bolt", label: "ボルト", shortLabel: "ボルト", category: "金属部品", description: "六角頭とねじ軸を持つ基本部品です。" },
  { type: "flat_head_screw", label: "皿ねじ", shortLabel: "皿ねじ", category: "金属部品", description: "広がった頭を持つねじです。" },
  { type: "pan_head_screw", label: "なべねじ", shortLabel: "なべねじ", category: "金属部品", description: "丸みのある頭を持つねじです。" },
  { type: "metal_rod", label: "金属棒", shortLabel: "金属棒", category: "線材", description: "アイテムの軸や持ち手に使えます。" },
  { type: "wire", label: "針金", shortLabel: "針金", category: "線材", description: "細い曲線風のパーツです。" },
  { type: "spring", label: "ばね", shortLabel: "ばね", category: "線材", description: "ボルタ・ナッティらしいコイル状パーツです。" },
  { type: "led_red", label: "赤LED", shortLabel: "赤LED", category: "LED", description: "赤く光るLEDパーツです。" },
  { type: "led_green", label: "緑LED", shortLabel: "緑LED", category: "LED", description: "緑に光るLEDパーツです。" },
  { type: "led_yellow", label: "黄LED", shortLabel: "黄LED", category: "LED", description: "黄色く光るLEDパーツです。" },
]

export const WORKBENCH_PART_BY_TYPE = Object.fromEntries(
  WORKBENCH_PARTS.map((part) => [part.type, part]),
) as Record<WorkbenchPartType, WorkbenchPartDefinition>
