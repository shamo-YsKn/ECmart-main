import type { WorkbenchPartType } from "@/lib/creation-model"

export interface WorkbenchPartVariant {
  id: string
  label: string
  shortLabel: string
  baseType: WorkbenchPartType
  description: string
  rewardId: string
  materialColor?: string
  secondaryColor?: string
  ledColor?: string
}

export const WORKBENCH_PART_VARIANTS: WorkbenchPartVariant[] = [
  {
    id: "gold-nut",
    label: "金色六角ナット",
    shortLabel: "金ナット",
    baseType: "hex_nut",
    description: "ガチャで獲得できる、明るい金色の六角ナットです。",
    rewardId: "workbench-gold-nut",
    materialColor: "#e5b84b",
  },
  {
    id: "black-nut",
    label: "黒鉄六角ナット",
    shortLabel: "黒ナット",
    baseType: "hex_nut",
    description: "重厚な黒鉄色の六角ナットです。",
    rewardId: "workbench-black-nut",
    materialColor: "#555d61",
  },
  {
    id: "brass-bolt",
    label: "真鍮ボルト",
    shortLabel: "真鍮ボルト",
    baseType: "bolt",
    description: "磨いた真鍮のような色合いのボルトです。",
    rewardId: "workbench-brass-bolt",
    materialColor: "#d5a637",
  },
  {
    id: "copper-wire",
    label: "銅色の針金",
    shortLabel: "銅線",
    baseType: "wire",
    description: "赤みのある銅色の針金です。工作の差し色に使えます。",
    rewardId: "workbench-copper-wire",
    materialColor: "#b86f45",
    secondaryColor: "#d6956c",
  },
  {
    id: "dark-spring",
    label: "黒ばね",
    shortLabel: "黒ばね",
    baseType: "spring",
    description: "黒染め金属のような濃い色のばねです。",
    rewardId: "workbench-dark-spring",
    materialColor: "#4f575c",
    secondaryColor: "#879096",
  },
  {
    id: "blue-led",
    label: "青LED",
    shortLabel: "青LED",
    baseType: "led_red",
    description: "鮮やかな青色に光る特別なLEDです。",
    rewardId: "workbench-blue-led",
    ledColor: "#38bdf8",
  },
  {
    id: "purple-led",
    label: "紫LED",
    shortLabel: "紫LED",
    baseType: "led_red",
    description: "紫色に光るスペシャルLEDです。",
    rewardId: "workbench-purple-led",
    ledColor: "#a855f7",
  },
]

export const WORKBENCH_VARIANT_BY_ID = new Map(
  WORKBENCH_PART_VARIANTS.map((variant) => [variant.id, variant]),
)

export function getWorkbenchVariant(variantId?: string | null) {
  return variantId ? WORKBENCH_VARIANT_BY_ID.get(variantId) ?? null : null
}

export function unlockedWorkbenchVariants(rewardIds: Set<string>) {
  return WORKBENCH_PART_VARIANTS.filter((variant) => rewardIds.has(variant.rewardId))
}

export function isWorkbenchVariantUnlocked(variantId: string, rewardIds: Set<string>) {
  const variant = getWorkbenchVariant(variantId)
  return Boolean(variant && rewardIds.has(variant.rewardId))
}
