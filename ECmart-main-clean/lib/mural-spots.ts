import { products, shops } from "@/lib/data"

export type MuralSpotType = "shop" | "restaurant" | "tourism" | "university" | "workshop" | "port"
export const MURAL_WALL_ROBOT_LIMIT = 5

export type MuralTheme = "university" | "cape" | "bridge" | "mountain" | "port" | "industrial" | "yakitori" | "ramen" | "farm" | "workshop" | "diner"

export interface MuralAmbientConfig {
  targetPopulation: number
  minimumAmbient: number
  baseWeights: { volta: number; natty: number }
  bodyColors: string[]
  accentColors: string[]
  poses: Array<"wave" | "stand" | "cheer" | "point">
  items: Array<"none" | "wrench" | "flower" | "gear" | "heart">
}

export interface MuroranSpot {
  id: string
  name: string
  shortName: string
  type: MuralSpotType
  area: string
  description: string
  emoji: string
  theme: MuralTheme
  mapPosition: { x: number; y: number }
  muralTitle: string
  muralSubtitle: string
  relatedShopId?: string
  ambient: MuralAmbientConfig
}

const STEEL = ["#9c9790", "#b8b2a8", "#6f7b80", "#c9a24b", "#8096a0"]
const WARM = ["#c9a24b", "#c87842", "#a96845", "#9c9790", "#b08a63"]
const SEA = ["#7b9aa8", "#9fb3bb", "#c9a24b", "#8d9697", "#78909c"]
const DARK = ["#60676d", "#777b7d", "#9c8a76", "#a37b50", "#4f5b60"]
const ACCENTS = ["#111111", "#293b46", "#7e2d25", "#315b73", "#5f4b33"]

function ambient(
  targetPopulation: number,
  bodyColors: string[],
  poses: MuralAmbientConfig["poses"],
  items: MuralAmbientConfig["items"],
  baseWeights = { volta: 0.55, natty: 0.45 },
): MuralAmbientConfig {
  return {
    targetPopulation: Math.min(MURAL_WALL_ROBOT_LIMIT, targetPopulation),
    minimumAmbient: 0,
    baseWeights,
    bodyColors,
    accentColors: ACCENTS,
    poses,
    items,
  }
}

export const MURORAN_SPOTS: MuroranSpot[] = [
  {
    id: "muroran-it",
    name: "室蘭工業大学",
    shortName: "室工大",
    type: "university",
    area: "水元町",
    description: "ものづくり・工学のまち室蘭を象徴する学びのスポット。大学らしい建物、鉄、歯車、ロケットを壁画モチーフにしています。",
    emoji: "🎓",
    theme: "university",
    mapPosition: { x: 66, y: 35 },
    muralTitle: "ものづくりと宇宙へつながる壁",
    muralSubtitle: "鉄・歯車・研究・ロケットを背景に、みんなのボルタとナッティが集合。",
    ambient: ambient(11, STEEL, ["wave", "stand", "cheer", "point"], ["wrench", "gear", "none"]),
  },
  {
    id: "chikyu-misaki",
    name: "地球岬",
    shortName: "地球岬",
    type: "tourism",
    area: "母恋南町",
    description: "太平洋の水平線と白い灯台が印象的な室蘭の代表的な景勝地。海を眺めるボルタたちが似合う壁画です。",
    emoji: "🌊",
    theme: "cape",
    mapPosition: { x: 52, y: 78 },
    muralTitle: "太平洋を見渡す壁",
    muralSubtitle: "灯台と水平線の前で、旅の思い出をボルタ・ナッティに託そう。",
    ambient: ambient(10, SEA, ["wave", "stand", "point", "cheer"], ["none", "flower", "heart"]),
  },
  {
    id: "hakucho-bridge",
    name: "白鳥大橋",
    shortName: "白鳥大橋",
    type: "tourism",
    area: "祝津町〜陣屋町",
    description: "室蘭港をまたぐ大きな吊橋。海、橋、風を感じるダイナミックな壁画デザインです。",
    emoji: "🌉",
    theme: "bridge",
    mapPosition: { x: 23, y: 34 },
    muralTitle: "海と橋を渡る壁",
    muralSubtitle: "白鳥大橋を背景に、指さしたり手を振ったりするロボットたち。",
    ambient: ambient(10, SEA, ["point", "wave", "cheer", "stand"], ["none", "gear"]),
  },
  {
    id: "sokuryo-mountain",
    name: "測量山",
    shortName: "測量山",
    type: "tourism",
    area: "清水町",
    description: "室蘭の市街地や港を見渡せる高台。山の稜線とアンテナをモチーフにした壁画です。",
    emoji: "⛰️",
    theme: "mountain",
    mapPosition: { x: 39, y: 49 },
    muralTitle: "まちを見晴らす壁",
    muralSubtitle: "高台から室蘭を眺める、少し落ち着いたボルタ・ナッティの居場所。",
    ambient: ambient(9, DARK, ["stand", "wave", "point"], ["none", "gear"]),
  },
  {
    id: "muroran-port",
    name: "室蘭港",
    shortName: "室蘭港",
    type: "port",
    area: "港湾エリア",
    description: "鉄のまちを支えてきた港。クレーン、船、鋼材をイメージした産業感のある壁画です。",
    emoji: "⚓",
    theme: "port",
    mapPosition: { x: 42, y: 31 },
    muralTitle: "鉄と海が出会う港の壁",
    muralSubtitle: "クレーンや鋼材のそばで働くようなボルタたちが行き交います。",
    ambient: ambient(10, DARK, ["stand", "point", "wave"], ["wrench", "gear", "none"], { volta: 0.65, natty: 0.35 }),
  },
  {
    id: "factory-night",
    name: "室蘭工場夜景エリア",
    shortName: "工場夜景",
    type: "tourism",
    area: "臨海部",
    description: "配管や煙突、工場の灯りがつくる室蘭らしい夜の景色。鉄と光を主役にした壁画です。",
    emoji: "🏭",
    theme: "industrial",
    mapPosition: { x: 30, y: 24 },
    muralTitle: "鉄と光がきらめく夜の壁",
    muralSubtitle: "工場の灯りと配管の間を、金属色のボルタ・ナッティが歩きます。",
    ambient: ambient(10, DARK, ["stand", "point", "wave", "cheer"], ["wrench", "gear", "none"], { volta: 0.62, natty: 0.38 }),
  },
  {
    id: "shop-tetsu",
    name: "てつ工房ボルタ",
    shortName: "てつ工房",
    type: "workshop",
    area: "こうば通り",
    description: "ねじやボルトから小さな鉄の仲間が生まれる工房。歯車、工具、鉄板を散りばめた壁画です。",
    emoji: "🔩",
    theme: "workshop",
    mapPosition: { x: 51, y: 43 },
    muralTitle: "ボルタたちが生まれる工房の壁",
    muralSubtitle: "工具と歯車に囲まれた、マチノワ室蘭の原点。",
    relatedShopId: "shop-tetsu",
    ambient: ambient(12, STEEL, ["wave", "stand", "cheer", "point"], ["wrench", "gear", "none"], { volta: 0.62, natty: 0.38 }),
  },
  {
    id: "shop-ippei",
    name: "やきとりの一平 本店",
    shortName: "一平",
    type: "restaurant",
    area: "中島町",
    description: "室蘭やきとりを楽しめる老舗。暖簾、炭火、串をイメージしたあたたかな壁画です。",
    emoji: "🍢",
    theme: "yakitori",
    mapPosition: { x: 63, y: 47 },
    muralTitle: "炭火とやきとりの壁",
    muralSubtitle: "食べた感想や思い出を、あなたのボルタ・ナッティと一緒に残そう。",
    relatedShopId: "shop-ippei",
    ambient: ambient(9, WARM, ["wave", "cheer", "stand"], ["heart", "flower", "none"]),
  },
  {
    id: "shop-isehiro",
    name: "室蘭やきとり 伊勢広",
    shortName: "伊勢広",
    type: "restaurant",
    area: "中島町",
    description: "室蘭やきとりとおでんを楽しめる店。串、湯気、暖簾をモチーフにした壁画です。",
    emoji: "🔥",
    theme: "yakitori",
    mapPosition: { x: 69, y: 51 },
    muralTitle: "やきとりと湯気の壁",
    muralSubtitle: "お店の思い出が、鉄の仲間たちの表情として増えていきます。",
    relatedShopId: "shop-isehiro",
    ambient: ambient(8, WARM, ["wave", "stand", "cheer"], ["heart", "none", "flower"]),
  },
  {
    id: "shop-daio",
    name: "味の大王 室蘭本店",
    shortName: "味の大王",
    type: "restaurant",
    area: "中央町",
    description: "室蘭カレーラーメンを楽しめるスポット。丼、湯気、黄色いカレー色を取り入れた壁画です。",
    emoji: "🍜",
    theme: "ramen",
    mapPosition: { x: 47, y: 57 },
    muralTitle: "カレーラーメンの湯気が立つ壁",
    muralSubtitle: "熱々の一杯を楽しんだレビューが、ロボットたちと並びます。",
    relatedShopId: "shop-daio",
    ambient: ambient(8, WARM, ["cheer", "wave", "stand"], ["none", "heart"]),
  },
  {
    id: "shop-kuromu",
    name: "黒夢（クロム）",
    shortName: "黒夢",
    type: "restaurant",
    area: "高砂町",
    description: "ボリュームのある丼や定食を楽しめる食堂。鉄板、皿、フライパンをイメージした壁画です。",
    emoji: "🍗",
    theme: "diner",
    mapPosition: { x: 72, y: 38 },
    muralTitle: "がっつりごはんの壁",
    muralSubtitle: "満足した気持ちを、元気なポーズのボルタ・ナッティで残そう。",
    relatedShopId: "shop-kuromu",
    ambient: ambient(8, DARK, ["cheer", "wave", "stand"], ["none", "heart", "wrench"]),
  },
  {
    id: "shop-uzura",
    name: "室蘭うずら園",
    shortName: "うずら園",
    type: "shop",
    area: "石川町",
    description: "室蘭生まれのうずら卵やスイーツを楽しめる場所。草原、卵、やわらかな光を使った壁画です。",
    emoji: "🥚",
    theme: "farm",
    mapPosition: { x: 84, y: 25 },
    muralTitle: "うずらとやさしい丘の壁",
    muralSubtitle: "プリンやおみやげの思い出を、やわらかな色の壁画に残せます。",
    relatedShopId: "shop-uzura",
    ambient: ambient(8, ["#c9a24b", "#d5c7a0", "#a7b58d", "#bfa77a", "#9c9790"], ["wave", "stand", "cheer"], ["flower", "heart", "none"], { volta: 0.4, natty: 0.6 }),
  },
]

export function getMuroranSpot(id: string | null | undefined) {
  return MURORAN_SPOTS.find((spot) => spot.id === id) ?? null
}

export function getSpotShop(spot: MuroranSpot) {
  if (!spot.relatedShopId) return null
  return shops.find((shop) => shop.id === spot.relatedShopId) ?? null
}

export function getSpotProducts(spot: MuroranSpot) {
  if (!spot.relatedShopId) return []
  return products.filter((product) => product.shopId === spot.relatedShopId)
}


interface MuralPlacementSurface {
  xMin: number
  xMax: number
  centerY: number
}

const MURAL_PLATFORM_SURFACES: Partial<Record<MuralTheme, MuralPlacementSurface[]>> = {
  university: [{ xMin: 8, xMax: 43, centerY: 31 }],
  bridge: [{ xMin: 12, xMax: 88, centerY: 49 }],
  cape: [{ xMin: 4, xMax: 40, centerY: 65 }],
  port: [{ xMin: 57, xMax: 86, centerY: 65 }],
  industrial: [
    { xMin: 8, xMax: 29, centerY: 41 },
    { xMin: 34, xMax: 58, centerY: 33 },
    { xMin: 65, xMax: 92, centerY: 45 },
  ],
}

/**
 * 壁画上のロボットは「空中に自由配置」せず、基本は画面下部の地面へ接地する。
 * 建物・橋など明確な足場があるテーマでは、クリック位置が近い場合だけその足場へ吸着する。
 * centerY は MuralRobotMarker の足元（transform-origin: 82%）を考慮した中心座標。
 */
export function snapMuralRobotY(spot: MuroranSpot, x: number, requestedY = 79.5) {
  const groundY = 79.5
  const candidates = (MURAL_PLATFORM_SURFACES[spot.theme] ?? []).filter((surface) => x >= surface.xMin && x <= surface.xMax)
  let best = groundY
  for (const surface of candidates) {
    if (Math.abs(surface.centerY - requestedY) < Math.abs(best - requestedY)) best = surface.centerY
  }
  return best
}
