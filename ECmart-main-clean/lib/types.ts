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

export interface RobotConfig {
  base: RobotBase
  size: number
  bodyColor: string
  accentColor: string
  pose: RobotPose
  item: RobotItem
  view: RobotView
  name: string
}
