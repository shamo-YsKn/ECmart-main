import { NextResponse } from "next/server"
import {
  externalRobotIdeaStatus,
  suggestRobotIdeasWithExternalAI,
} from "@/lib/robot-idea-external-server"
import type { RobotIdeaColorOption, RobotIdeaContext } from "@/lib/robot-idea-engine"
import { ROBOT_ITEM_VALUES, normalizeRobotConfig } from "@/lib/robot-config"
import type { RobotItem } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const HEX = /^#[0-9a-f]{6}$/i
const WINDOW_MS = 60_000
const DEFAULT_LIMIT = 10
const buckets = new Map<string, { startedAt: number; count: number }>()

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return true
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "local"
}

function limitPerMinute() {
  const parsed = Number(process.env.MACHINOWA_AI_RATE_LIMIT_PER_MINUTE)
  return Number.isFinite(parsed) ? Math.min(60, Math.max(1, Math.round(parsed))) : DEFAULT_LIMIT
}

function takeRateLimitSlot(request: Request) {
  const now = Date.now()
  const key = clientKey(request)
  const current = buckets.get(key)
  if (!current || now - current.startedAt >= WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 })
    return true
  }
  if (current.count >= limitPerMinute()) return false
  current.count += 1
  return true
}

function sanitizeColors(value: unknown, fallback: string): RobotIdeaColorOption[] {
  if (!Array.isArray(value)) return [{ label: "現在色", value: fallback }]
  const seen = new Set<string>()
  const result: RobotIdeaColorOption[] = []
  for (const raw of value.slice(0, 20)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue
    const input = raw as Record<string, unknown>
    const color = typeof input.value === "string" ? input.value.trim().toLowerCase() : ""
    if (!HEX.test(color) || seen.has(color)) continue
    seen.add(color)
    result.push({
      label: typeof input.label === "string" ? input.label.trim().slice(0, 30) || "色" : "色",
      value: color,
    })
  }
  if (!seen.has(fallback.toLowerCase())) result.unshift({ label: "現在色", value: fallback.toLowerCase() })
  return result.slice(0, 20)
}

function sanitizeItems(value: unknown): RobotItem[] {
  const allowed = new Set<string>(ROBOT_ITEM_VALUES)
  if (!Array.isArray(value)) return [...ROBOT_ITEM_VALUES]
  const result = value
    .filter((entry): entry is string => typeof entry === "string" && allowed.has(entry))
    .slice(0, ROBOT_ITEM_VALUES.length) as RobotItem[]
  return result.length ? Array.from(new Set(result)) : ["none"]
}

function sanitizeContext(value: unknown): RobotIdeaContext {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const currentConfig = normalizeRobotConfig(input.currentConfig)
  return {
    currentConfig,
    availableItems: sanitizeItems(input.availableItems),
    availableBodyColors: sanitizeColors(input.availableBodyColors, currentConfig.bodyColor),
    availableAccentColors: sanitizeColors(input.availableAccentColors, currentConfig.accentColor),
    requestedProvider: "external",
  }
}

export async function GET() {
  const status = externalRobotIdeaStatus()
  return NextResponse.json({
    ok: true,
    ...status,
    rateLimitPerMinute: limitPerMinute(),
  }, {
    headers: { "Cache-Control": "no-store" },
  })
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 })
  }
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.json({ ok: false, error: "JSON body required" }, { status: 415 })
  }

  const body = await request.json().catch(() => null) as { query?: unknown; context?: unknown } | null
  const query = typeof body?.query === "string" ? body.query.trim().slice(0, 240) : ""
  if (!query) return NextResponse.json({ ok: false, error: "入力文が必要です。" }, { status: 400 })

  const context = sanitizeContext(body?.context)
  const status = externalRobotIdeaStatus()
  if (status.configured && !takeRateLimitSlot(request)) {
    const { suggestRobotIdeas } = await import("@/lib/robot-idea-engine")
    const fallback = suggestRobotIdeas(query, { ...context, requestedProvider: "rules" })
    return NextResponse.json({
      ok: true,
      result: {
        ...fallback,
        requestedProvider: "external",
        externalProviderConfigured: true,
        externalModel: status.model,
        fallbackReason: "この端末からのAI提案回数が一時上限に達したため、ルールベースで提案しました。",
      },
    }, { headers: { "Cache-Control": "no-store" } })
  }

  const result = await suggestRobotIdeasWithExternalAI(query, context)
  return NextResponse.json({ ok: true, result }, {
    headers: { "Cache-Control": "no-store" },
  })
}
