import type {
  RobotBase,
  RobotConfig,
  RobotItem,
  RobotPose,
  RobotView,
  SavedRobot,
} from "@/lib/types"
import { normalizePoseState } from "@/lib/robot-pose-2d"

export const ROBOT_CONFIG_SCHEMA_VERSION = 1 as const
export const ROBOT_DRAFT_KEY = "machinowa:robot-draft"

export const ROBOT_BASE_VALUES = ["volta", "natty"] as const satisfies readonly RobotBase[]
export const ROBOT_VIEW_VALUES = ["front", "side", "back"] as const satisfies readonly RobotView[]
export const ROBOT_POSE_VALUES = ["wave", "stand", "cheer", "point"] as const satisfies readonly RobotPose[]
export const ROBOT_ITEM_VALUES = ["none", "wrench", "flower", "gear", "heart"] as const satisfies readonly RobotItem[]

const ROBOT_BASE_SET = new Set<string>(ROBOT_BASE_VALUES)
const ROBOT_VIEW_SET = new Set<string>(ROBOT_VIEW_VALUES)
const ROBOT_POSE_SET = new Set<string>(ROBOT_POSE_VALUES)
const ROBOT_ITEM_SET = new Set<string>(ROBOT_ITEM_VALUES)
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

export const DEFAULT_ROBOT_CONFIG: Readonly<RobotConfig> = Object.freeze({
  base: "volta",
  size: 55,
  bodyColor: "#c9a24b",
  accentColor: "#111111",
  pose: "cheer",
  item: "none",
  view: "front",
  name: "ボルタ",
  poseState: { mode: "preset" as const, preset: "cheer" as const, joints: {}, axes: { front: {}, side: {} } },
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined
}

function finiteNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export function defaultRobotName(base: RobotBase) {
  return base === "natty" ? "ナッティ" : "ボルタ"
}

export function sanitizeRobotName(value: unknown, base: RobotBase, fallback?: string) {
  const raw = stringValue(value)?.trim()
  if (raw) return raw.slice(0, 40)
  const fallbackRaw = fallback?.trim()
  return (fallbackRaw || defaultRobotName(base)).slice(0, 40)
}

export function sanitizeRobotColor(value: unknown, fallback: string) {
  const color = stringValue(value)?.trim()
  return color && HEX_COLOR.test(color) ? color.toLowerCase() : fallback
}

export function sanitizeRobotSize(value: unknown, fallback = DEFAULT_ROBOT_CONFIG.size) {
  const size = finiteNumber(value) ?? fallback
  return Math.min(90, Math.max(20, Math.round(size)))
}

/**
 * PC / mobile / Supabase の全経路で使うロボット設定の正規化関数。
 * 旧保存形式 RobotConfig は変更せず、未知・欠損値だけ安全な既定値へ戻します。
 */
export function normalizeRobotConfig(
  value: unknown,
  options: { fallbackName?: string; fallback?: Partial<RobotConfig> } = {},
): RobotConfig {
  const input = isRecord(value) ? value : {}
  const fallback = { ...DEFAULT_ROBOT_CONFIG, ...options.fallback }

  const rawBase = stringValue(input.base)
  const base = (rawBase && ROBOT_BASE_SET.has(rawBase) ? rawBase : fallback.base) as RobotBase

  const rawView = stringValue(input.view)
  const view = (rawView && ROBOT_VIEW_SET.has(rawView) ? rawView : fallback.view) as RobotView

  const rawPose = stringValue(input.pose)
  const pose = (rawPose && ROBOT_POSE_SET.has(rawPose) ? rawPose : fallback.pose) as RobotPose

  const rawItem = stringValue(input.item)
  const item = (rawItem && ROBOT_ITEM_SET.has(rawItem) ? rawItem : fallback.item) as RobotItem

  return {
    base,
    view,
    pose,
    item,
    size: sanitizeRobotSize(input.size, fallback.size),
    bodyColor: sanitizeRobotColor(input.bodyColor, fallback.bodyColor),
    accentColor: sanitizeRobotColor(input.accentColor, fallback.accentColor),
    name: sanitizeRobotName(
      input.name,
      base,
      options.fallbackName ?? (fallback.base === base ? fallback.name : defaultRobotName(base)),
    ),
    poseState: normalizePoseState(pose, input.poseState),
  }
}

/** Supabase / REST から来た saved_robots 1行を安全に読み取ります。 */
export function parseSavedRobotRow(value: unknown): SavedRobot | null {
  if (!isRecord(value) || !isRecord(value.config)) return null

  const id = stringValue(value.id)
  const userId = stringValue(value.user_id)
  const rowName = stringValue(value.name)
  const createdAt = stringValue(value.created_at)
  const updatedAt = stringValue(value.updated_at)

  if (!id || !userId || !rowName || !createdAt || !updatedAt || typeof value.is_avatar !== "boolean") {
    return null
  }

  const config = normalizeRobotConfig(value.config, { fallbackName: rowName })
  return {
    id,
    user_id: userId,
    name: sanitizeRobotName(rowName, config.base),
    config,
    is_avatar: value.is_avatar,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}
