import { normalizeDioramaDocument } from "@/lib/diorama-model"
import { normalizeRobotConfig } from "@/lib/robot-config"
import { normalizeCustomItemDocument, type SavedCustomItem } from "@/lib/custom-item-model"
import type { SavedRobot } from "@/lib/types"
import type { DioramaDocument } from "@/lib/creation-model"

export const GALLERY_PAGE_SIZE = 12
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export type ContentKind = "diorama" | "mural"
export type PublicationSnapshot = { schemaVersion: 1; document: DioramaDocument; robots: SavedRobot[]; customItems: SavedCustomItem[] }
export type GalleryWork = {
  id: string; userId: string; title: string; description: string; authorName: string
  snapshot: PublicationSnapshot; publishedAt: string; updatedAt: string; likeCount: number; likedByMe: boolean
}
export function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}
function text(value: unknown, limit: number) { return typeof value === "string" ? value.slice(0, limit) : "" }

export function parsePublicationSnapshot(value: unknown): PublicationSnapshot | null {
  const raw = record(value)
  if (!raw || raw.schemaVersion !== 1 || !record(raw.document) || !Array.isArray(raw.robots) || !Array.isArray(raw.customItems)) return null
  const robots: SavedRobot[] = raw.robots.slice(0, 24).flatMap((entry) => {
    const r = record(entry)
    if (!r || typeof r.id !== "string" || !record(r.config)) return []
    return [{ id: r.id, name: text(r.name, 40), config: normalizeRobotConfig(r.config), user_id: "", is_avatar: false, created_at: "", updated_at: "" }]
  })
  const customItems: SavedCustomItem[] = raw.customItems.slice(0, 56).flatMap((entry) => {
    const r = record(entry)
    if (!r || typeof r.id !== "string" || !record(r.document)) return []
    return [{ id: r.id, name: text(r.name, 40), document: normalizeCustomItemDocument(r.document), user_id: "", created_at: "", updated_at: "" }]
  })
  return { schemaVersion: 1, document: normalizeDioramaDocument(raw.document), robots, customItems }
}
export function parseGalleryWork(value: unknown): GalleryWork | null {
  const r = record(value)
  if (!r || typeof r.id !== "string" || !UUID_PATTERN.test(r.id) || typeof r.user_id !== "string") return null
  const snapshot = parsePublicationSnapshot(r.snapshot)
  if (!snapshot) return null
  const count = Number(r.like_count)
  return { id: r.id, userId: r.user_id, title: text(r.title, 40), description: text(r.description, 1000), authorName: text(r.author_name, 40),
    snapshot, publishedAt: text(r.published_at, 60), updatedAt: text(r.updated_at, 60), likeCount: Number.isFinite(count) ? Math.max(0, count) : 0, likedByMe: r.liked_by_me === true }
}
export function communityError(error: unknown) {
  const e = record(error)
  const code = e?.code
  if (code === "42P01" || code === "42883" || code === "PGRST202" || code === "PGRST205") return "作品共有の設定が未完了です。管理者がPhase 6のSQLを実行してください。"
  if (code === "42501") return "この操作にはログインまたは管理者権限が必要です。"
  if (code === "P0001" && typeof e?.message === "string") return e.message
  return "通信に失敗しました。接続を確認して、もう一度お試しください。"
}
