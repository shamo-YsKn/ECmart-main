import {
  CREATION_DOCUMENT_VERSION,
  type CustomItemDocument,
  type CustomItemPartPlacement,
  type SceneTransform,
  type Vec3,
  type WorkbenchPartType,
} from "@/lib/creation-model"

export const CUSTOM_ITEM_DRAFT_KEY = "machinowa:custom-item-draft"
export const CUSTOM_ITEM_MAX_PARTS = 60

export const WORKBENCH_PART_TYPES = [
  "hex_nut",
  "washer",
  "bolt",
  "flat_head_screw",
  "pan_head_screw",
  "metal_rod",
  "wire",
  "spring",
  "led_red",
  "led_green",
  "led_yellow",
] as const satisfies readonly WorkbenchPartType[]

const PART_TYPE_SET = new Set<string>(WORKBENCH_PART_TYPES)

export interface SavedCustomItem {
  id: string
  user_id: string
  name: string
  document: CustomItemDocument
  created_at: string
  updated_at: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function finiteNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function vec3(value: unknown, fallback: Vec3): Vec3 {
  if (!Array.isArray(value) || value.length < 3) return [...fallback] as Vec3
  return [
    finiteNumber(value[0], fallback[0]),
    finiteNumber(value[1], fallback[1]),
    finiteNumber(value[2], fallback[2]),
  ]
}

export function sanitizeCustomItemName(value: unknown, fallback = "マイアイテム") {
  if (typeof value !== "string") return fallback
  const name = value.trim().replace(/\s+/g, " ")
  return (name || fallback).slice(0, 40)
}

export function normalizeWorkbenchTransform(value: unknown): SceneTransform {
  const input = isRecord(value) ? value : {}
  const position = vec3(input.position, [0, 0, 0])
  const rotation = vec3(input.rotationDeg, [0, 0, 0])
  const scale = vec3(input.scale, [1, 1, 1])
  const uniformScale = clamp(Math.abs(scale[0] || 1), 0.25, 3)
  return {
    position: [clamp(position[0], -360, 360), clamp(position[1], -280, 280), clamp(position[2], -100, 100)],
    rotationDeg: [0, 0, clamp(rotation[2], -360, 360)],
    scale: [uniformScale, uniformScale, uniformScale],
  }
}

export function normalizeCustomItemPart(value: unknown, index = 0): CustomItemPartPlacement | null {
  if (!isRecord(value)) return null
  const partType = typeof value.partType === "string" && PART_TYPE_SET.has(value.partType)
    ? (value.partType as WorkbenchPartType)
    : null
  if (!partType) return null

  const instanceId = typeof value.instanceId === "string" && value.instanceId.trim()
    ? value.instanceId.slice(0, 100)
    : `part-${index + 1}`

  return {
    instanceId,
    partType,
    transform: normalizeWorkbenchTransform(value.transform),
    ...(typeof value.variantId === "string" && value.variantId.trim()
      ? { variantId: value.variantId.slice(0, 80) }
      : {}),
  }
}

export function createEmptyCustomItemDocument(name = "マイアイテム"): CustomItemDocument {
  return {
    schemaVersion: CREATION_DOCUMENT_VERSION,
    kind: "custom-item",
    name: sanitizeCustomItemName(name),
    editorMode: "2d",
    coordinateSpace: "item-workbench-v1",
    parts: [],
  }
}

export function normalizeCustomItemDocument(value: unknown, fallbackName = "マイアイテム"): CustomItemDocument {
  const input = isRecord(value) ? value : {}
  const partsInput = Array.isArray(input.parts) ? input.parts.slice(0, CUSTOM_ITEM_MAX_PARTS) : []
  const parts = partsInput
    .map((part, index) => normalizeCustomItemPart(part, index))
    .filter((part): part is CustomItemPartPlacement => Boolean(part))

  return {
    schemaVersion: CREATION_DOCUMENT_VERSION,
    kind: "custom-item",
    name: sanitizeCustomItemName(input.name, fallbackName),
    editorMode: "2d",
    coordinateSpace: "item-workbench-v1",
    parts,
  }
}

export function parseSavedCustomItemRow(value: unknown): SavedCustomItem | null {
  if (!isRecord(value) || !isRecord(value.document)) return null
  const id = typeof value.id === "string" ? value.id : null
  const userId = typeof value.user_id === "string" ? value.user_id : null
  const rowName = typeof value.name === "string" ? value.name : null
  const createdAt = typeof value.created_at === "string" ? value.created_at : null
  const updatedAt = typeof value.updated_at === "string" ? value.updated_at : null
  if (!id || !userId || !rowName || !createdAt || !updatedAt) return null

  const document = normalizeCustomItemDocument(value.document, rowName)
  return {
    id,
    user_id: userId,
    name: sanitizeCustomItemName(rowName, document.name),
    document: { ...document, name: sanitizeCustomItemName(rowName, document.name) },
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

export function newWorkbenchInstanceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `part-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
