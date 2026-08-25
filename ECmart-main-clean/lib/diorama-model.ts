import {
  CREATION_DOCUMENT_VERSION,
  type DioramaDocument,
  type DioramaItemPlacement,
  type DioramaRobotPlacement,
  type DioramaStageReference,
  type SceneTransform,
  type Vec3,
} from "@/lib/creation-model"
import {
  STARTER_DIORAMA_STAGE_ID,
  getDioramaStage,
  getDioramaStageByRewardId,
  type DioramaStageDefinition,
} from "@/lib/diorama-stages"

export const DIORAMA_DRAFT_KEY = "machinowa:diorama-draft"
export const DIORAMA_MAX_ROBOTS = 24
export const DIORAMA_MAX_ITEMS = 32

export interface SavedDiorama {
  id: string
  user_id: string
  name: string
  document: DioramaDocument
  created_at: string
  updated_at: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function finite(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function vec3(value: unknown, fallback: Vec3): Vec3 {
  if (!Array.isArray(value) || value.length < 3) return [...fallback] as Vec3
  return [finite(value[0], fallback[0]), finite(value[1], fallback[1]), finite(value[2], fallback[2])]
}

export function sanitizeDioramaName(value: unknown, fallback = "マイジオラマ") {
  if (typeof value !== "string") return fallback
  const name = value.trim().replace(/\s+/g, " ")
  return (name || fallback).slice(0, 40)
}

export function normalizeDioramaTransform(value: unknown): SceneTransform {
  const input = isRecord(value) ? value : {}
  const position = vec3(input.position, [0, 50, 10])
  const rotation = vec3(input.rotationDeg, [0, 0, 0])
  const scale = vec3(input.scale, [1, 1, 1])
  const uniformScale = clamp(Math.abs(scale[0] || 1), 0.25, 2.5)
  return {
    position: [clamp(position[0], -305, 305), clamp(position[1], -165, 165), clamp(position[2], 0, 100)],
    rotationDeg: [0, 0, clamp(rotation[2], -180, 180)],
    scale: [uniformScale, uniformScale, uniformScale],
  }
}

export function dioramaStageReferenceFor(stage: DioramaStageDefinition): DioramaStageReference {
  return stage.rewardId
    ? { kind: "reward", rewardId: stage.rewardId }
    : { kind: "builtin", stageId: stage.id }
}

export function stageIdFromReference(reference: DioramaStageReference) {
  if (reference.kind === "builtin") return getDioramaStage(reference.stageId)?.id ?? STARTER_DIORAMA_STAGE_ID
  return getDioramaStageByRewardId(reference.rewardId)?.id ?? STARTER_DIORAMA_STAGE_ID
}

function normalizeStageReference(value: unknown): DioramaStageReference {
  if (!isRecord(value)) return { kind: "builtin", stageId: STARTER_DIORAMA_STAGE_ID }
  if (value.kind === "reward" && typeof value.rewardId === "string") {
    const stage = getDioramaStageByRewardId(value.rewardId)
    if (stage) return { kind: "reward", rewardId: value.rewardId }
  }
  if (value.kind === "builtin" && typeof value.stageId === "string") {
    const stage = getDioramaStage(value.stageId)
    if (stage && !stage.rewardId) return { kind: "builtin", stageId: stage.id }
  }
  return { kind: "builtin", stageId: STARTER_DIORAMA_STAGE_ID }
}

function normalizeRobotPlacement(value: unknown, index: number): DioramaRobotPlacement | null {
  if (!isRecord(value) || typeof value.savedRobotId !== "string" || !value.savedRobotId.trim()) return null
  return {
    placementId: typeof value.placementId === "string" && value.placementId.trim() ? value.placementId.slice(0, 100) : `robot-${index + 1}`,
    savedRobotId: value.savedRobotId.slice(0, 100),
    transform: normalizeDioramaTransform(value.transform),
  }
}

function normalizeItemPlacement(value: unknown, index: number): DioramaItemPlacement | null {
  if (!isRecord(value) || typeof value.customItemId !== "string" || !value.customItemId.trim()) return null
  return {
    placementId: typeof value.placementId === "string" && value.placementId.trim() ? value.placementId.slice(0, 100) : `item-${index + 1}`,
    customItemId: value.customItemId.slice(0, 100),
    transform: normalizeDioramaTransform(value.transform),
  }
}

export function createEmptyDioramaDocument(name = "マイジオラマ"): DioramaDocument {
  return {
    schemaVersion: CREATION_DOCUMENT_VERSION,
    kind: "diorama",
    name: sanitizeDioramaName(name),
    editorMode: "2d",
    coordinateSpace: "diorama-stage-v1",
    stage: { kind: "builtin", stageId: STARTER_DIORAMA_STAGE_ID },
    robots: [],
    items: [],
  }
}

export function normalizeDioramaDocument(value: unknown, fallbackName = "マイジオラマ"): DioramaDocument {
  const input = isRecord(value) ? value : {}
  const robots = (Array.isArray(input.robots) ? input.robots : [])
    .slice(0, DIORAMA_MAX_ROBOTS)
    .map((placement, index) => normalizeRobotPlacement(placement, index))
    .filter((placement): placement is DioramaRobotPlacement => Boolean(placement))
  const items = (Array.isArray(input.items) ? input.items : [])
    .slice(0, DIORAMA_MAX_ITEMS)
    .map((placement, index) => normalizeItemPlacement(placement, index))
    .filter((placement): placement is DioramaItemPlacement => Boolean(placement))

  return {
    schemaVersion: CREATION_DOCUMENT_VERSION,
    kind: "diorama",
    name: sanitizeDioramaName(input.name, fallbackName),
    editorMode: "2d",
    coordinateSpace: "diorama-stage-v1",
    stage: normalizeStageReference(input.stage),
    robots,
    items,
  }
}

export function parseSavedDioramaRow(value: unknown): SavedDiorama | null {
  if (!isRecord(value) || !isRecord(value.document)) return null
  const id = typeof value.id === "string" ? value.id : null
  const userId = typeof value.user_id === "string" ? value.user_id : null
  const rowName = typeof value.name === "string" ? value.name : null
  const createdAt = typeof value.created_at === "string" ? value.created_at : null
  const updatedAt = typeof value.updated_at === "string" ? value.updated_at : null
  if (!id || !userId || !rowName || !createdAt || !updatedAt) return null
  const document = normalizeDioramaDocument(value.document, rowName)
  const name = sanitizeDioramaName(rowName, document.name)
  return { id, user_id: userId, name, document: { ...document, name }, created_at: createdAt, updated_at: updatedAt }
}

export function newDioramaPlacementId(prefix: "robot" | "item") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
