import type { GachaInventoryItem } from "@/lib/types"

export interface DioramaStageDefinition {
  id: string
  label: string
  description: string
  emoji: string
  rewardId?: string
  atmosphere: string
}

export const STARTER_DIORAMA_STAGE_ID = "starter-workshop"

export const DIORAMA_STAGES: DioramaStageDefinition[] = [
  {
    id: STARTER_DIORAMA_STAGE_ID,
    label: "ボルタ工房",
    description: "最初から使える、工具と金属部品に囲まれたシンプルな工作ステージです。",
    emoji: "🛠️",
    atmosphere: "workshop",
  },
  {
    id: "muroran-port",
    label: "室蘭港",
    description: "港とクレーンを背景にした室蘭らしい海辺のジオラマです。",
    emoji: "⚓",
    rewardId: "stage-muroran-port",
    atmosphere: "harbor",
  },
  {
    id: "muroran-it",
    label: "室蘭工業大学",
    description: "キャンパスをイメージしたジオラマ背景。ボルタ・ナッティを大学に配置できます。",
    emoji: "🏫",
    rewardId: "stage-muroran-it",
    atmosphere: "campus",
  },
  {
    id: "muroran-it-tech",
    label: "室蘭工業大学 研究エリア",
    description: "ロボット・建築・化学の研究イメージをまとめた、室工大の第2ジオラマです。",
    emoji: "🤖",
    rewardId: "stage-muroran-it-tech",
    atmosphere: "campus-tech",
  },
  {
    id: "chikyu-misaki",
    label: "地球岬",
    description: "海と空が広がる地球岬をイメージしたステージです。",
    emoji: "🌊",
    rewardId: "stage-chikyu-misaki",
    atmosphere: "cape",
  },
  {
    id: "sokuryozan",
    label: "測量山",
    description: "室蘭の街を見渡す高台をイメージしたジオラマです。",
    emoji: "⛰️",
    rewardId: "stage-sokuryozan",
    atmosphere: "mountain",
  },
  {
    id: "hakucho-bridge",
    label: "白鳥大橋",
    description: "白鳥大橋と室蘭港の景色を楽しめる特別ステージです。",
    emoji: "🌉",
    rewardId: "stage-hakucho-bridge",
    atmosphere: "bridge",
  },
  {
    id: "factory-night",
    label: "室蘭工場夜景",
    description: "光る工場群を背景にした、夜のスペシャルジオラマです。",
    emoji: "🌃",
    rewardId: "stage-factory-night",
    atmosphere: "factory-night",
  },
]

export const DIORAMA_STAGE_BY_ID = new Map(DIORAMA_STAGES.map((stage) => [stage.id, stage]))
export const DIORAMA_STAGE_BY_REWARD_ID = new Map(
  DIORAMA_STAGES.filter((stage) => stage.rewardId).map((stage) => [stage.rewardId!, stage]),
)

export function getDioramaStage(stageId: string) {
  return DIORAMA_STAGE_BY_ID.get(stageId) ?? null
}

export function getDioramaStageByRewardId(rewardId: string) {
  return DIORAMA_STAGE_BY_REWARD_ID.get(rewardId) ?? null
}

export function unlockedDioramaStages(inventory: GachaInventoryItem[]) {
  const rewardIds = new Set(inventory.map((entry) => entry.rewardId))
  return DIORAMA_STAGES.filter((stage) => !stage.rewardId || rewardIds.has(stage.rewardId))
}

export interface DioramaPlacementSurface {
  id: string
  label: string
  /** stage SVG pixel coordinates (640 x 360) */
  xMin: number
  xMax: number
  yPx: number
  kind: "ground" | "platform"
}

const DIORAMA_PLACEMENT_SURFACES: Record<string, DioramaPlacementSurface[]> = {
  "starter-workshop": [
    { id: "ground", label: "工房の床", xMin: 0, xMax: 640, yPx: 326, kind: "ground" },
  ],
  "muroran-port": [
    { id: "ground", label: "港の岸壁", xMin: 0, xMax: 640, yPx: 324, kind: "ground" },
    { id: "dock", label: "岸壁デッキ", xMin: 0, xMax: 640, yPx: 273, kind: "platform" },
  ],
  "muroran-it": [
    { id: "ground", label: "キャンパスの地面", xMin: 0, xMax: 640, yPx: 324, kind: "ground" },
    { id: "roof", label: "校舎の屋上", xMin: 130, xMax: 510, yPx: 128, kind: "platform" },
  ],
  "muroran-it-tech": [
    { id: "ground", label: "研究広場の地面", xMin: 0, xMax: 640, yPx: 324, kind: "ground" },
    { id: "terrace", label: "研究棟テラス", xMin: 108, xMax: 532, yPx: 208, kind: "platform" },
    { id: "annex-roof", label: "別棟の屋上", xMin: 392, xMax: 596, yPx: 170, kind: "platform" },
  ],
  "chikyu-misaki": [
    { id: "ground", label: "岬の地面", xMin: 0, xMax: 640, yPx: 330, kind: "ground" },
    { id: "cliff", label: "岬の高台", xMin: 0, xMax: 230, yPx: 278, kind: "platform" },
  ],
  "sokuryozan": [
    { id: "ground", label: "展望スペース", xMin: 0, xMax: 640, yPx: 330, kind: "ground" },
  ],
  "hakucho-bridge": [
    { id: "ground", label: "手前の地面", xMin: 0, xMax: 640, yPx: 330, kind: "ground" },
    { id: "bridge-deck", label: "白鳥大橋のデッキ", xMin: 70, xMax: 580, yPx: 238, kind: "platform" },
  ],
  "factory-night": [
    { id: "ground", label: "工場前の地面", xMin: 0, xMax: 640, yPx: 326, kind: "ground" },
    { id: "low-roof", label: "工場の屋上", xMin: 390, xMax: 560, yPx: 196, kind: "platform" },
  ],
}

export function getDioramaPlacementSurfaces(stageId: string) {
  return DIORAMA_PLACEMENT_SURFACES[stageId] ?? DIORAMA_PLACEMENT_SURFACES[STARTER_DIORAMA_STAGE_ID]
}
