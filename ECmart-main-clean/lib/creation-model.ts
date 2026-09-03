import type { RobotConfig, RobotHeldItemReference, RobotPoseState, RobotView } from "@/lib/types"
import { normalizeRobotConfig } from "@/lib/robot-config"

/**
 * 制作機能全体で共有する永続化データの初版。
 * 既存の saved_robots.config は当面 RobotConfig のまま維持し、
 * 自由ポーズ実装時にこの document へ段階的に移行します。
 */
export const CREATION_DOCUMENT_VERSION = 1 as const

export type Vec3 = [number, number, number]

/**
 * 保存時の回転角は degree に統一します。
 * position は画面pxではなく各 editor の local design unit を使います。
 */
export interface SceneTransform {
  position: Vec3
  rotationDeg: Vec3
  scale: Vec3
}

export const IDENTITY_SCENE_TRANSFORM: Readonly<SceneTransform> = Object.freeze({
  position: [0, 0, 0] as Vec3,
  rotationDeg: [0, 0, 0] as Vec3,
  scale: [1, 1, 1] as Vec3,
})

export type HeldItemReference = RobotHeldItemReference


export interface RobotCreationDocument {
  schemaVersion: typeof CREATION_DOCUMENT_VERSION
  kind: "robot"
  config: RobotConfig
  poseState: RobotPoseState
  heldItem: HeldItemReference
}

export type WorkbenchPartType =
  | "hex_nut"
  | "washer"
  | "bolt"
  | "flat_head_screw"
  | "pan_head_screw"
  | "metal_rod"
  | "wire"
  | "spring"
  | "led_red"
  | "led_green"
  | "led_yellow"

export interface CustomItemPartPlacement {
  instanceId: string
  partType: WorkbenchPartType
  transform: SceneTransform
  variantId?: string
  /** Phase 2-2: 自分のsocketを相手のsocketへ接続。 */
  attachedTo?: { instanceId: string; socketId: string; ownSocketId: string }
}

export interface CustomItemDocument {
  schemaVersion: typeof CREATION_DOCUMENT_VERSION
  kind: "custom-item"
  name: string
  editorMode: "2d" | "3d"
  coordinateSpace: "item-workbench-v1"
  parts: CustomItemPartPlacement[]
}

export type DioramaStageReference =
  | { kind: "builtin"; stageId: string }
  | { kind: "reward"; rewardId: string }

export interface DioramaRobotPlacement {
  placementId: string
  savedRobotId: string
  /** ジオラマ上での向き。正面・側面・背面を選べます。 */
  view: RobotView
  transform: SceneTransform
}

export interface DioramaItemPlacement {
  placementId: string
  customItemId: string
  transform: SceneTransform
}

export interface DioramaDocument {
  schemaVersion: typeof CREATION_DOCUMENT_VERSION
  kind: "diorama"
  name: string
  editorMode: "2d" | "3d"
  coordinateSpace: "diorama-stage-v1"
  stage: DioramaStageReference
  robots: DioramaRobotPlacement[]
  items: DioramaItemPlacement[]
  camera?: {
    position: Vec3
    target: Vec3
    zoom: number
  }
}

/** 現在の固定ポーズ RobotConfig を将来形式へ安全に包む互換アダプタ。 */
export function robotConfigToCreationDocument(config: RobotConfig): RobotCreationDocument {
  const normalized = normalizeRobotConfig(config)
  return {
    schemaVersion: CREATION_DOCUMENT_VERSION,
    kind: "robot",
    config: normalized,
    poseState: normalized.poseState ?? { mode: "preset", preset: normalized.pose, joints: {}, axes: { front: {}, side: {} } },
    heldItem: normalized.heldItem ?? { kind: "builtin", item: normalized.item },
  }
}

/** 自由ポーズ導入前の画面へ戻すための互換アダプタ。 */
export function creationDocumentToRobotConfig(document: RobotCreationDocument): RobotConfig {
  const normalized = normalizeRobotConfig(document.config)
  return {
    ...normalized,
    pose: document.poseState.preset,
    poseState: document.poseState,
    item: document.heldItem.kind === "builtin" ? document.heldItem.item : "none",
    heldItem: document.heldItem,
  }
}
