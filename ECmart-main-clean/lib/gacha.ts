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
]

export const GACHA_REWARD_BY_ID = new Map(GACHA_REWARDS.map((reward) => [reward.id, reward]))

export const GACHA_CATEGORY_LABELS: Record<GachaRewardCategory, string> = {
  body_color: "ボディカラー",
  accent_color: "目の色",
  item: "持ちもの",
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
  }
  return { kind: "icon" as const, icon: icons[reward.value] ?? "🎁" }
}
