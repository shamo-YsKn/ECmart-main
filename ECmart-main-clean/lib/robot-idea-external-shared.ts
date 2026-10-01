import { suggestCustomItemIdea } from "@/lib/custom-item-idea-engine"
import {
  ROBOT_IDEA_ENGINE_VERSION,
  type RobotIdeaCandidate,
  type RobotIdeaContext,
  type RobotIdeaResult,
} from "@/lib/robot-idea-engine"
import {
  DEFAULT_ROBOT_CONFIG,
  ROBOT_BASE_VALUES,
  ROBOT_ITEM_VALUES,
  ROBOT_POSE_VALUES,
  ROBOT_VIEW_VALUES,
  normalizeRobotConfig,
} from "@/lib/robot-config"
import type { RobotBase, RobotItem, RobotPose, RobotView } from "@/lib/types"

export interface ExternalRobotIdeaDraft {
  title: string
  summary: string
  themeLabel: string
  base: RobotBase
  pose: RobotPose
  item: RobotItem
  view: RobotView
  bodyColor: string
  accentColor: string
  customItemHint: string
  reasons: string[]
}

const BASES = new Set<string>(ROBOT_BASE_VALUES)
const POSES = new Set<string>(ROBOT_POSE_VALUES)
const ITEMS = new Set<string>(ROBOT_ITEM_VALUES)
const VIEWS = new Set<string>(ROBOT_VIEW_VALUES)
const HEX = /^#[0-9a-f]{6}$/i

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

function stringArray(value: unknown, maxItems: number, maxText: number) {
  return Array.isArray(value)
    ? value.map((entry) => text(entry, maxText)).filter(Boolean).slice(0, maxItems)
    : []
}

export function parseExternalRobotIdeaDrafts(value: unknown): ExternalRobotIdeaDraft[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const rawCandidates = (value as Record<string, unknown>).candidates
  if (!Array.isArray(rawCandidates) || rawCandidates.length !== 3) return null

  const result: ExternalRobotIdeaDraft[] = []
  for (const raw of rawCandidates) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
    const input = raw as Record<string, unknown>
    const base = text(input.base, 20)
    const pose = text(input.pose, 20)
    const item = text(input.item, 20)
    const view = text(input.view, 20)
    const bodyColor = text(input.bodyColor, 16).toLowerCase()
    const accentColor = text(input.accentColor, 16).toLowerCase()
    const title = text(input.title, 40)
    const summary = text(input.summary, 180)
    const themeLabel = text(input.themeLabel, 28)
    if (!title || !summary || !themeLabel) return null
    if (!BASES.has(base) || !POSES.has(pose) || !ITEMS.has(item) || !VIEWS.has(view)) return null
    if (!HEX.test(bodyColor) || !HEX.test(accentColor)) return null

    result.push({
      title,
      summary,
      themeLabel,
      base: base as RobotBase,
      pose: pose as RobotPose,
      item: item as RobotItem,
      view: view as RobotView,
      bodyColor,
      accentColor,
      customItemHint: text(input.customItemHint, 50),
      reasons: stringArray(input.reasons, 2, 120),
    })
  }
  return result
}

export function buildExternalRobotIdeaResult(
  queryInput: string,
  drafts: readonly ExternalRobotIdeaDraft[],
  context: RobotIdeaContext,
  model: string,
): RobotIdeaResult | null {
  if (drafts.length !== 3) return null
  const query = queryInput.trim().slice(0, 240)
  const current = normalizeRobotConfig(context.currentConfig ?? DEFAULT_ROBOT_CONFIG)
  const allowedItems = new Set<RobotItem>(context.availableItems?.length ? context.availableItems : ROBOT_ITEM_VALUES)
  const bodyColors = new Set((context.availableBodyColors ?? []).map((entry) => entry.value.toLowerCase()))
  const accentColors = new Set((context.availableAccentColors ?? []).map((entry) => entry.value.toLowerCase()))

  const candidates: RobotIdeaCandidate[] = drafts.map((draft, index) => {
    const item = allowedItems.has(draft.item) ? draft.item : "none"
    const bodyColor = bodyColors.size === 0 || bodyColors.has(draft.bodyColor) ? draft.bodyColor : current.bodyColor
    const accentColor = accentColors.size === 0 || accentColors.has(draft.accentColor) ? draft.accentColor : current.accentColor
    const config = normalizeRobotConfig({
      ...current,
      base: draft.base,
      pose: draft.pose,
      item,
      heldItem: { kind: "builtin", item },
      view: draft.view,
      bodyColor,
      accentColor,
      name: draft.title,
      poseState: { mode: "preset", preset: draft.pose, joints: {}, axes: { front: {}, side: {} } },
    })
    const customItemProposal = draft.customItemHint
      ? suggestCustomItemIdea(query, draft.customItemHint) ?? undefined
      : undefined

    return {
      id: `external-${index + 1}`,
      title: draft.title,
      summary: draft.summary,
      themeId: `external-${index + 1}`,
      themeLabel: draft.themeLabel,
      matchedKeywords: [],
      config,
      reasons: draft.reasons.length ? draft.reasons : ["入力文全体の意味から外部AIが構成を提案しました。"],
      ...(draft.customItemHint ? { futureCustomItemHint: draft.customItemHint } : {}),
      ...(customItemProposal ? { customItemProposal } : {}),
    }
  })

  return {
    engineVersion: ROBOT_IDEA_ENGINE_VERSION,
    query,
    requestedProvider: "external",
    providerUsed: "gemini",
    externalProviderConfigured: true,
    externalModel: model,
    matchedThemeIds: drafts.map((draft) => `ai:${draft.themeLabel}`).slice(0, 3),
    candidates,
  }
}
