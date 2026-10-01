import type { CustomItemDocument, CustomItemPartPlacement } from "@/lib/creation-model"
import type { RobotBase, RobotConfig } from "@/lib/types"
import { WORKBENCH_PART_BY_TYPE } from "@/lib/workbench-parts"

/**
 * 2026-10-01時点のボルタ工房公式通販価格を基準にした「参考価格」モデル。
 * 公式の料金表ではなく、公開されている実売価格からサイト用に作った推定モデルです。
 *
 * 主要アンカー:
 * - 通常ボルタ 1,150円
 * - 通常ナッティ 1,250円
 * - クラリネットのボルタ 1,900円 -> +750円
 * - やきとりボルタ / 工房限定楽器ナッティ 2,200-2,300円 -> おおむね +1,050円
 * - ライダーボルタ 3,400円 -> ボルタ基準から +2,250円
 */
export const PRICE_ESTIMATOR_MODEL_VERSION = "official-anchor-2026-10-v1" as const

export const ROBOT_BASE_REFERENCE_PRICE: Readonly<Record<RobotBase, number>> = Object.freeze({
  volta: 1150,
  natty: 1250,
})

export type ItemPriceTier = "standard" | "detailed" | "complex" | "large"

export interface ItemPriceTierDefinition {
  id: ItemPriceTier
  label: string
  surcharge: number
  description: string
}

export const PRICE_SCORE_RULES = Object.freeze({
  parts: { free: 4, weight: 2, max: 24 },
  connections: { free: 2, weight: 3, max: 18 },
  specialParts: { free: 1, weight: 4, max: 16 },
  uniqueTypes: { free: 2, weight: 3, max: 12 },
  depth: { free: 60, step: 30, stepScore: 2, max: 10 },
  scale: { free: 1.25, weight: 10, max: 8 },
  size: { normal: 1, detailed: 1.2, high: 1.45, scores: [0, 5, 10, 16] as const },
  tierThresholds: { detailed: 18, complex: 38 },
  large: { sizeRatio: 1.55, depthSpan: 300, partCount: 24, manyParts: 18, manyPartsSizeRatio: 1.15 },
})

export const ITEM_PRICE_TIERS: Readonly<Record<ItemPriceTier, ItemPriceTierDefinition>> = Object.freeze({
  standard: {
    id: "standard",
    label: "通常範囲",
    surcharge: 0,
    description: "通常シリーズに含まれる小物・ポーズ相当",
  },
  detailed: {
    id: "detailed",
    label: "詳細小物",
    surcharge: 750,
    description: "クラリネットのボルタを下限アンカーにした詳細工作",
  },
  complex: {
    id: "complex",
    label: "高複雑度",
    surcharge: 1050,
    description: "やきとり・限定楽器・戦国シリーズ相当の複雑な工作",
  },
  large: {
    id: "large",
    label: "大型・機械構造",
    surcharge: 2250,
    description: "ライダーボルタをアンカーにした大型・立体構造",
  },
})

export interface CustomItemPriceFeatures {
  partCount: number
  connectionCount: number
  uniquePartTypeCount: number
  specialPartCount: number
  variantPartCount: number
  maxScale: number
  widthSpan: number
  heightSpan: number
  depthSpan: number
  sizeRatio: number
}

export interface CustomItemScoreComponent {
  key: "parts" | "connections" | "special" | "diversity" | "depth" | "scale" | "size"
  label: string
  score: number
  maxScore: number
  detail: string
}

export interface CustomItemPriceEstimate {
  modelVersion: typeof PRICE_ESTIMATOR_MODEL_VERSION
  score: number
  tier: ItemPriceTier
  tierLabel: string
  surcharge: number
  features: CustomItemPriceFeatures
  components: CustomItemScoreComponent[]
  largeStructure: boolean
  largeStructureReasons: string[]
}

export interface RobotReferencePriceEstimate {
  modelVersion: typeof PRICE_ESTIMATOR_MODEL_VERSION
  base: RobotBase
  basePrice: number
  customItemSurcharge: number
  total: number
  itemEstimate: CustomItemPriceEstimate | null
}

const SPECIAL_TYPES = new Set([
  "wire",
  "spring",
  "led_red",
  "led_green",
  "led_yellow",
])

/**
 * 価格判定用のおおまかな外形寸法（工作台design unit）。
 * 画面描画の厳密な当たり判定ではなく、大型構造を判定するための安定した代理値です。
 */
const PART_EXTENTS: Readonly<Record<CustomItemPartPlacement["partType"], readonly [number, number]>> = Object.freeze({
  hex_nut: [92, 92],
  washer: [96, 96],
  bolt: [142, 64],
  flat_head_screw: [136, 62],
  pan_head_screw: [136, 66],
  metal_rod: [144, 28],
  wire: [142, 88],
  spring: [146, 58],
  led_red: [76, 108],
  led_green: [76, 108],
  led_yellow: [76, 108],
})

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function scoreBeyond(value: number, free: number, weight: number, max: number) {
  return clamp(Math.round(Math.max(0, value - free) * weight), 0, max)
}

function itemSpans(parts: CustomItemPartPlacement[]) {
  if (!parts.length) return { widthSpan: 0, heightSpan: 0, depthSpan: 0, maxScale: 1 }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let maxScale = 1

  for (const part of parts) {
    const scale = Math.max(0.25, Math.abs(part.transform.scale[0] || 1))
    maxScale = Math.max(maxScale, scale)
    const [width, height] = PART_EXTENTS[part.partType]
    const depth = WORKBENCH_PART_BY_TYPE[part.partType].depth
    const halfW = width * scale / 2
    const halfH = height * scale / 2
    const halfD = depth * scale / 2
    const [x, y, z] = part.transform.position
    minX = Math.min(minX, x - halfW)
    maxX = Math.max(maxX, x + halfW)
    minY = Math.min(minY, y - halfH)
    maxY = Math.max(maxY, y + halfH)
    minZ = Math.min(minZ, z - halfD)
    maxZ = Math.max(maxZ, z + halfD)
  }

  return {
    widthSpan: round1(maxX - minX),
    heightSpan: round1(maxY - minY),
    depthSpan: round1(maxZ - minZ),
    maxScale: round1(maxScale),
  }
}

export function extractCustomItemPriceFeatures(document: CustomItemDocument): CustomItemPriceFeatures {
  const parts = document.parts ?? []
  const { widthSpan, heightSpan, depthSpan, maxScale } = itemSpans(parts)
  const partTypes = new Set(parts.map((part) => part.partType))
  const connectionCount = parts.filter((part) => Boolean(part.attachedTo)).length
  const specialPartCount = parts.filter((part) => SPECIAL_TYPES.has(part.partType)).length
  const variantPartCount = parts.filter((part) => Boolean(part.variantId)).length

  // 工作台の通常範囲を1.0とする。奥行きは正面より狭くても立体性が高いので別基準。
  const sizeRatio = Math.max(
    widthSpan / 360,
    heightSpan / 280,
    depthSpan / 180,
  )

  return {
    partCount: parts.length,
    connectionCount,
    uniquePartTypeCount: partTypes.size,
    specialPartCount,
    variantPartCount,
    maxScale,
    widthSpan,
    heightSpan,
    depthSpan,
    sizeRatio: round1(sizeRatio),
  }
}

export function estimateCustomItemPrice(document: CustomItemDocument): CustomItemPriceEstimate {
  const f = extractCustomItemPriceFeatures(document)

  // 通常商品にも小物・道具は多いため、最初の数個・数接続は「無料枠」として扱う。
  const partScore = scoreBeyond(f.partCount, PRICE_SCORE_RULES.parts.free, PRICE_SCORE_RULES.parts.weight, PRICE_SCORE_RULES.parts.max)
  const connectionScore = scoreBeyond(f.connectionCount, PRICE_SCORE_RULES.connections.free, PRICE_SCORE_RULES.connections.weight, PRICE_SCORE_RULES.connections.max)
  const specialScore = scoreBeyond(f.specialPartCount, PRICE_SCORE_RULES.specialParts.free, PRICE_SCORE_RULES.specialParts.weight, PRICE_SCORE_RULES.specialParts.max)
  const diversityScore = scoreBeyond(f.uniquePartTypeCount, PRICE_SCORE_RULES.uniqueTypes.free, PRICE_SCORE_RULES.uniqueTypes.weight, PRICE_SCORE_RULES.uniqueTypes.max)
  const depthScore = clamp(
    Math.round(Math.max(0, f.depthSpan - PRICE_SCORE_RULES.depth.free) / PRICE_SCORE_RULES.depth.step) * PRICE_SCORE_RULES.depth.stepScore,
    0,
    PRICE_SCORE_RULES.depth.max,
  )
  const scaleScore = clamp(Math.round(Math.max(0, f.maxScale - PRICE_SCORE_RULES.scale.free) * PRICE_SCORE_RULES.scale.weight), 0, PRICE_SCORE_RULES.scale.max)
  const sizeScore = f.sizeRatio > PRICE_SCORE_RULES.size.high
    ? PRICE_SCORE_RULES.size.scores[3]
    : f.sizeRatio > PRICE_SCORE_RULES.size.detailed
      ? PRICE_SCORE_RULES.size.scores[2]
      : f.sizeRatio > PRICE_SCORE_RULES.size.normal
        ? PRICE_SCORE_RULES.size.scores[1]
        : PRICE_SCORE_RULES.size.scores[0]

  const components: CustomItemScoreComponent[] = [
    { key: "parts", label: "部品数", score: partScore, maxScore: 24, detail: `${f.partCount}個（4個までは通常範囲）` },
    { key: "connections", label: "接続数", score: connectionScore, maxScore: 18, detail: `${f.connectionCount}接続（2接続までは通常範囲）` },
    { key: "special", label: "特殊部品", score: specialScore, maxScore: 16, detail: `${f.specialPartCount}個（針金・ばね・LED）` },
    { key: "diversity", label: "部品種類", score: diversityScore, maxScore: 12, detail: `${f.uniquePartTypeCount}種類` },
    { key: "depth", label: "奥行き", score: depthScore, maxScore: 10, detail: `${Math.round(f.depthSpan)} unit` },
    { key: "scale", label: "拡大率", score: scaleScore, maxScore: 8, detail: `最大${Math.round(f.maxScale * 100)}%` },
    { key: "size", label: "全体サイズ", score: sizeScore, maxScore: 16, detail: `基準比${f.sizeRatio.toFixed(1)}倍` },
  ]
  const score = clamp(components.reduce((sum, component) => sum + component.score, 0), 0, 100)

  const largeStructureReasons: string[] = []
  if (f.sizeRatio >= PRICE_SCORE_RULES.large.sizeRatio) largeStructureReasons.push(`外形が通常工作の約${PRICE_SCORE_RULES.large.sizeRatio}倍以上`)
  if (f.depthSpan >= PRICE_SCORE_RULES.large.depthSpan) largeStructureReasons.push(`奥行きが${PRICE_SCORE_RULES.large.depthSpan}unit以上`)
  if (f.partCount >= PRICE_SCORE_RULES.large.partCount) largeStructureReasons.push(`部品数が${PRICE_SCORE_RULES.large.partCount}個以上`)
  if (f.partCount >= PRICE_SCORE_RULES.large.manyParts && f.sizeRatio >= PRICE_SCORE_RULES.large.manyPartsSizeRatio) largeStructureReasons.push("多数部品かつ大きな外形")
  const largeStructure = largeStructureReasons.length > 0

  let tier: ItemPriceTier
  if (f.partCount === 0) tier = "standard"
  else if (largeStructure) tier = "large"
  else if (score >= PRICE_SCORE_RULES.tierThresholds.complex) tier = "complex"
  else if (score >= PRICE_SCORE_RULES.tierThresholds.detailed) tier = "detailed"
  else tier = "standard"

  const definition = ITEM_PRICE_TIERS[tier]
  return {
    modelVersion: PRICE_ESTIMATOR_MODEL_VERSION,
    score,
    tier,
    tierLabel: definition.label,
    surcharge: definition.surcharge,
    features: f,
    components,
    largeStructure,
    largeStructureReasons,
  }
}

export function robotBaseReferencePrice(base: RobotBase) {
  return ROBOT_BASE_REFERENCE_PRICE[base]
}

/**
 * ポーズ・色・既存の標準持ち物は通常商品価格に吸収し、
 * 自作アイテムを装備しているときだけ工作Tier加算を行います。
 */
export function estimateRobotReferencePrice(
  config: RobotConfig,
  customItemDocument?: CustomItemDocument | null,
): RobotReferencePriceEstimate {
  const basePrice = robotBaseReferencePrice(config.base)
  const customHeld = config.heldItem?.kind === "custom"
  const itemEstimate = customHeld && customItemDocument
    ? estimateCustomItemPrice(customItemDocument)
    : null
  const customItemSurcharge = itemEstimate?.surcharge ?? 0

  return {
    modelVersion: PRICE_ESTIMATOR_MODEL_VERSION,
    base: config.base,
    basePrice,
    customItemSurcharge,
    total: basePrice + customItemSurcharge,
    itemEstimate,
  }
}

export function formatReferencePrice(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value)
}
