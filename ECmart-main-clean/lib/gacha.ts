import type {
  GachaInventoryItem,
  GachaRarity,
  GachaReward,
  GachaRewardCategory,
  RobotItem,
} from "@/lib/types"

export const GACHA_COST = 100

export const STARTER_BODY_COLOR = "#c9a24b"
export const STARTER_ACCENT_COLOR = "#111111"
export const STARTER_ITEM: RobotItem = "none"

export const GACHA_REWARDS: GachaReward[] = [
  { id: "body-silver", category: "body_color", label: "しろがね", value: "#eceeef", rarity: "normal", weight: 12 },
  { id: "body-dark-steel", category: "body_color", label: "くろがね", value: "#8d9194", rarity: "normal", weight: 12 },
  { id: "body-hagane", category: "body_color", label: "はがね", value: "#8a8f96", rarity: "normal", weight: 10 },
  { id: "body-brick", category: "body_color", label: "レンガ", value: "#e8842f", rarity: "rare", weight: 7 },
  { id: "body-blue", category: "body_color", label: "あおがね", value: "#5b8c9c", rarity: "rare", weight: 7 },
  { id: "body-green", category: "body_color", label: "もえぎ", value: "#7ba05b", rarity: "rare", weight: 7 },
  { id: "body-pink", category: "body_color", label: "うすべに", value: "#d98aa0", rarity: "special", weight: 3 },

  { id: "eye-gray", category: "accent_color", label: "濃いグレー", value: "#777777", rarity: "normal", weight: 12 },
  { id: "eye-yellow", category: "accent_color", label: "たまご", value: "#ffcf4d", rarity: "normal", weight: 10 },
  { id: "eye-blue", category: "accent_color", label: "みずいろ", value: "#5fb6d1", rarity: "rare", weight: 7 },
  { id: "eye-green", category: "accent_color", label: "わかば", value: "#6fbf73", rarity: "rare", weight: 7 },
  { id: "eye-pink", category: "accent_color", label: "さくら", value: "#e86a8f", rarity: "rare", weight: 6 },
  { id: "eye-orange", category: "accent_color", label: "だいだい", value: "#f08a3c", rarity: "special", weight: 3 },

  { id: "item-wrench", category: "item", label: "スパナ", value: "wrench", rarity: "normal", weight: 11 },
  { id: "item-gear", category: "item", label: "歯車", value: "gear", rarity: "normal", weight: 10 },
  { id: "item-flower", category: "item", label: "お花", value: "flower", rarity: "rare", weight: 6 },
  { id: "item-heart", category: "item", label: "ハート", value: "heart", rarity: "special", weight: 3 },

  { id: "workbench-gold-nut", category: "workbench_part", label: "金色六角ナット", value: "gold-nut", rarity: "normal", weight: 8 },
  { id: "workbench-black-nut", category: "workbench_part", label: "黒鉄六角ナット", value: "black-nut", rarity: "normal", weight: 8 },
  { id: "workbench-brass-bolt", category: "workbench_part", label: "真鍮ボルト", value: "brass-bolt", rarity: "normal", weight: 7 },
  { id: "workbench-copper-wire", category: "workbench_part", label: "銅色の針金", value: "copper-wire", rarity: "rare", weight: 5 },
  { id: "workbench-dark-spring", category: "workbench_part", label: "黒ばね", value: "dark-spring", rarity: "rare", weight: 5 },
  { id: "workbench-blue-led", category: "workbench_part", label: "青LED", value: "blue-led", rarity: "rare", weight: 4 },
  { id: "workbench-purple-led", category: "workbench_part", label: "紫LED", value: "purple-led", rarity: "special", weight: 2 },

  { id: "stage-muroran-port", category: "diorama_stage", label: "室蘭港", value: "muroran-port", rarity: "normal", weight: 7 },
  { id: "stage-muroran-it", category: "diorama_stage", label: "室蘭工業大学", value: "muroran-it", rarity: "rare", weight: 5 },
  { id: "stage-chikyu-misaki", category: "diorama_stage", label: "地球岬", value: "chikyu-misaki", rarity: "rare", weight: 5 },
  { id: "stage-sokuryozan", category: "diorama_stage", label: "測量山", value: "sokuryozan", rarity: "rare", weight: 4 },
  { id: "stage-hakucho-bridge", category: "diorama_stage", label: "白鳥大橋", value: "hakucho-bridge", rarity: "special", weight: 3 },
  { id: "stage-factory-night", category: "diorama_stage", label: "室蘭工場夜景", value: "factory-night", rarity: "special", weight: 2 },
]

export const GACHA_REWARD_BY_ID = new Map(GACHA_REWARDS.map((reward) => [reward.id, reward]))

export const GACHA_CATEGORY_LABELS: Record<GachaRewardCategory, string> = {
  body_color: "ボディカラー",
  accent_color: "目の色",
  item: "持ちもの",
  workbench_part: "工作素材",
  diorama_stage: "ジオラマ背景",
}

export const GACHA_RARITY_LABELS: Record<GachaRarity, string> = {
  normal: "ノーマル",
  rare: "レア",
  special: "スペシャル",
}

export function getGachaReward(rewardId: string) {
  return GACHA_REWARD_BY_ID.get(rewardId) ?? null
}

export function inventoryRewardIds(inventory: GachaInventoryItem[]) {
  return new Set(inventory.map((entry) => entry.rewardId))
}

export function isGachaValueUnlocked(
  inventory: GachaInventoryItem[],
  category: GachaRewardCategory,
  value: string,
) {
  if (category === "body_color" && value === STARTER_BODY_COLOR) return true
  if (category === "accent_color" && value === STARTER_ACCENT_COLOR) return true
  if (category === "item" && value === STARTER_ITEM) return true

  const reward = GACHA_REWARDS.find(
    (candidate) => candidate.category === category && candidate.value === value,
  )
  return Boolean(reward && inventory.some((entry) => entry.rewardId === reward.id))
}

export function rewardPreview(reward: GachaReward) {
  if (reward.category === "body_color" || reward.category === "accent_color") {
    return { kind: "color" as const, color: reward.value }
  }
  const icons: Record<string, string> = {
    wrench: "🔧",
    gear: "⚙️",
    flower: "🌼",
    heart: "❤",
    "gold-nut": "🔩",
    "black-nut": "🔩",
    "brass-bolt": "🔩",
    "copper-wire": "〰️",
    "dark-spring": "🌀",
    "blue-led": "🔵",
    "purple-led": "🟣",
    "muroran-port": "⚓",
    "muroran-it": "🏫",
    "chikyu-misaki": "🌊",
    sokuryozan: "⛰️",
    "hakucho-bridge": "🌉",
    "factory-night": "🌃",
  }
  return { kind: "icon" as const, icon: icons[reward.value] ?? "🎁" }
}
