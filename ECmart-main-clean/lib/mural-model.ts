import type { CustomItemDocument } from "@/lib/creation-model"
import { normalizeCustomItemDocument } from "@/lib/custom-item-model"
import { normalizeRobotConfig } from "@/lib/robot-config"
import type { RobotConfig, RobotView } from "@/lib/types"
import { getMuroranSpot } from "@/lib/mural-spots"

export const MURAL_REVIEW_MAX_LENGTH = 400
export const MURAL_AUTHOR_NAME_MAX_LENGTH = 40
export const MURAL_MIN_SCALE = 0.55
export const MURAL_MAX_SCALE = 1.35

export interface MuralPost {
  id: string
  userId: string
  spotId: string
  savedRobotId: string
  authorName: string
  robotName: string
  robotConfig: RobotConfig
  robotView: RobotView
  muralVariant: string
  customItemDocument: CustomItemDocument | null
  review: string
  positionX: number
  positionY: number
  scale: number
  rotationDeg: number
  createdAt: string
  updatedAt: string
}

export interface MuralLikeRow {
  postId: string
  userId: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null
}

function robotViewValue(value: unknown): RobotView {
  return value === "side" || value === "back" ? value : "front"
}

function muralVariantValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 40) : "default"
}

function numberValue(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export function clampMuralPositionX(value: number) {
  return Math.min(94, Math.max(6, value))
}

export function clampMuralPositionY(value: number) {
  return Math.min(88, Math.max(26, value))
}

export function clampMuralScale(value: number) {
  return Math.min(MURAL_MAX_SCALE, Math.max(MURAL_MIN_SCALE, value))
}

export function clampMuralRotation(value: number) {
  return Math.min(24, Math.max(-24, value))
}

export function sanitizeMuralReview(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim().replace(/\r\n/g, "\n").slice(0, MURAL_REVIEW_MAX_LENGTH)
}

export function sanitizeMuralAuthorName(value: unknown, fallback = "マチノワユーザー") {
  if (typeof value !== "string") return fallback
  const name = value.trim().replace(/\s+/g, " ")
  return (name || fallback).slice(0, MURAL_AUTHOR_NAME_MAX_LENGTH)
}

export function parseMuralPostRow(value: unknown): MuralPost | null {
  if (!isRecord(value)) return null
  const id = stringValue(value.id)
  const userId = stringValue(value.user_id)
  const spotId = stringValue(value.spot_id)
  const savedRobotId = stringValue(value.saved_robot_id)
  const authorName = stringValue(value.author_name)
  const robotName = stringValue(value.robot_name)
  const review = stringValue(value.review)
  const createdAt = stringValue(value.created_at)
  const updatedAt = stringValue(value.updated_at)
  if (!id || !userId || !spotId || !savedRobotId || !authorName || !robotName || review === null || !createdAt || !updatedAt) return null
  if (!getMuroranSpot(spotId)) return null

  const customItemDocument = isRecord(value.custom_item_document)
    ? normalizeCustomItemDocument(value.custom_item_document, "壁画アイテム")
    : null

  return {
    id,
    userId,
    spotId,
    savedRobotId,
    authorName: sanitizeMuralAuthorName(authorName),
    robotName: robotName.slice(0, 40),
    robotConfig: normalizeRobotConfig(value.robot_config, { fallbackName: robotName }),
    robotView: robotViewValue(value.robot_view),
    muralVariant: muralVariantValue(value.mural_variant),
    customItemDocument,
    review: sanitizeMuralReview(review),
    positionX: clampMuralPositionX(numberValue(value.position_x, 50)),
    positionY: clampMuralPositionY(numberValue(value.position_y, 62)),
    scale: clampMuralScale(numberValue(value.scale, 1)),
    rotationDeg: clampMuralRotation(numberValue(value.rotation_deg, 0)),
    createdAt,
    updatedAt,
  }
}

export function parseMuralLikeRow(value: unknown): MuralLikeRow | null {
  if (!isRecord(value)) return null
  const postId = stringValue(value.post_id)
  const userId = stringValue(value.user_id)
  return postId && userId ? { postId, userId } : null
}

export function isMissingMuralStorage(error: { code?: string; message?: string } | null | undefined) {
  const text = error?.message?.toLowerCase() ?? ""
  return error?.code === "42P01" || error?.code === "42703" || text.includes("mural_posts") || text.includes("mural_post_likes") || text.includes("robot_view") || text.includes("mural_variant")
}
