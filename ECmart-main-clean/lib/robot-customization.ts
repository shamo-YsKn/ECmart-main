import type { RobotItem } from "@/lib/types"

export interface RobotColorOption {
  label: string
  value: string
  rewardId: string | null
}

/** PC版とスマホ版で必ず同じ解放条件を使うための共通カタログ。 */
export const ROBOT_BODY_COLORS: readonly RobotColorOption[] = [
  { label: "しんちゅう", value: "#c9a24b", rewardId: null },
  { label: "しろがね", value: "#eceeef", rewardId: "body-silver" },
  { label: "くろがね", value: "#8d9194", rewardId: "body-dark-steel" },
  { label: "はがね", value: "#8a8f96", rewardId: "body-hagane" },
  { label: "レンガ", value: "#e8842f", rewardId: "body-brick" },
  { label: "あおがね", value: "#5b8c9c", rewardId: "body-blue" },
  { label: "もえぎ", value: "#7ba05b", rewardId: "body-green" },
  { label: "うすべに", value: "#d98aa0", rewardId: "body-pink" },
]

export const ROBOT_ACCENT_COLORS: readonly RobotColorOption[] = [
  { label: "黒", value: "#111111", rewardId: null },
  { label: "濃いグレー", value: "#777777", rewardId: "eye-gray" },
  { label: "たまご", value: "#ffcf4d", rewardId: "eye-yellow" },
  { label: "みずいろ", value: "#5fb6d1", rewardId: "eye-blue" },
  { label: "わかば", value: "#6fbf73", rewardId: "eye-green" },
  { label: "さくら", value: "#e86a8f", rewardId: "eye-pink" },
  { label: "だいだい", value: "#f08a3c", rewardId: "eye-orange" },
]

export const ROBOT_ITEM_REWARD_IDS: Readonly<Record<RobotItem, string | null>> = {
  none: null,
  wrench: "item-wrench",
  gear: "item-gear",
  flower: "item-flower",
  heart: "item-heart",
}

export function isRobotColorUnlocked(option: RobotColorOption, unlockedRewardIds: ReadonlySet<string>, currentValue: string) {
  return !option.rewardId || unlockedRewardIds.has(option.rewardId) || option.value === currentValue
}

export function isRobotItemUnlocked(item: RobotItem, unlockedRewardIds: ReadonlySet<string>, currentItem: RobotItem) {
  const rewardId = ROBOT_ITEM_REWARD_IDS[item]
  return !rewardId || unlockedRewardIds.has(rewardId) || item === currentItem
}
