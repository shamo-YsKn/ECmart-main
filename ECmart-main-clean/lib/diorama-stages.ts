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
