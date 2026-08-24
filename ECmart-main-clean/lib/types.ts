export type ShopCategory = "食品" | "工芸" | "雑貨" | "花・緑" | "喫茶"

export interface Shop {
  id: string
  name: string
  owner: string
  category: ShopCategory
  town: string
  tagline: string
  description: string
  emoji: string
  color: string
  rating: number
  established: string
}

export interface Product {
  id: string
  shopId: string
  name: string
  price: number
  description: string
  emoji: string
  tags: string[]
  soldCount: number
  /** 直近30日間の販売個数。現在はランキング表示用のサンプル値です。 */
  last30DaysSold: number
}

export interface CartItem {
  productId: string
  quantity: number
}

export interface TownEvent {
  id: string
  date: string
  weekday: string
  title: string
  location: string
  description: string
  tag: string
  url: string
}

/** ロボット工房の設定 */
export type RobotBase = "volta" | "natty"
export type RobotView = "front" | "side" | "back"
export type RobotPose = "wave" | "stand" | "cheer" | "point"
export type RobotItem = "none" | "wrench" | "flower" | "gear" | "heart"

export type RobotJointId =
  | "leftShoulder"
  | "leftElbow"
  | "rightShoulder"
  | "rightElbow"
  | "leftHip"
  | "leftKnee"
  | "rightHip"
  | "rightKnee"

export type RobotJointAngles = Partial<Record<RobotJointId, number>>

/**
 * 2D自由ポーズの2.5D保存形式。
 * front は正面/背面で共有する左右方向、side は側面で編集する前後方向。
 * joints はPhase 1-2 v1互換のfront軸エイリアスとして残します。
 */
export interface RobotPoseState {
  mode: "preset" | "custom"
  preset: RobotPose
  joints: RobotJointAngles
  axes?: {
    front?: RobotJointAngles
    side?: RobotJointAngles
  }
}

/**
 * 頭部の向き。degreeで保存します。
 * yaw/pitch はボルト頭全体、eyeYaw/eyePitch は目ねじの微調整です。
 */
export interface RobotHeadPose {
  yaw: number
  pitch: number
  eyeYaw: number
  eyePitch: number
}

export interface RobotConfig {
  base: RobotBase
  size: number
  bodyColor: string
  accentColor: string
  pose: RobotPose
  item: RobotItem
  view: RobotView
  name: string
  /** 旧保存データには存在しないためoptional。読み込み時に補完します。 */
  poseState?: RobotPoseState
  /** 旧保存データはすべて0°として補完します。 */
  headPose?: RobotHeadPose
}

/** Supabaseに保存されたロボット */
export interface SavedRobot {
  id: string
  user_id: string
  name: string
  config: RobotConfig
  is_avatar: boolean
  created_at: string
  updated_at: string
}



/** サイト内購入の結果 */
export interface PurchaseResult {
  orderId: string
  productTotal: number
  shippingTotal: number
  totalAmount: number
  pointsAwarded: number
  pointsBalance: number
  createdAt?: string
}

/** アカウントに保存された購入履歴 */
export interface PurchaseOrder extends PurchaseResult {
  userId: string
  status: "completed"
}


/** ガチャ景品 */
export type GachaRewardCategory = "body_color" | "accent_color" | "item"
export type GachaRarity = "normal" | "rare" | "special"

export interface GachaReward {
  id: string
  category: GachaRewardCategory
  label: string
  value: string
  rarity: GachaRarity
  weight: number
}

export interface GachaInventoryItem {
  rewardId: string
  quantity: number
  firstAcquiredAt?: string
  lastAcquiredAt?: string
}

export interface GachaSpinResult {
  rollId: string
  rewardId: string
  category: GachaRewardCategory
  label: string
  value: string
  rarity: GachaRarity
  quantity: number
  pointsBalance: number
  duplicate: boolean
}
