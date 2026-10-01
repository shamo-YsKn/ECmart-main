import {
  buildExternalRobotIdeaResult,
  parseExternalRobotIdeaDrafts,
} from "@/lib/robot-idea-external-shared"
import { suggestRobotIdeas, type RobotIdeaContext, type RobotIdeaResult } from "@/lib/robot-idea-engine"
import { normalizeRobotConfig } from "@/lib/robot-config"

export const DEFAULT_GEMINI_IDEA_MODEL = "gemini-3.1-flash-lite"
const GEMINI_ENDPOINT_ROOT = "https://generativelanguage.googleapis.com/v1beta/models"
const REQUEST_TIMEOUT_MS = 9000
const MODEL_NAME = /^[a-z0-9._-]{3,80}$/i

function apiKey() {
  return process.env.GEMINI_API_KEY?.trim() || process.env.MACHINOWA_GEMINI_API_KEY?.trim() || ""
}

export function externalRobotIdeaStatus() {
  const key = apiKey()
  const configuredModel = process.env.MACHINOWA_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_IDEA_MODEL
  return {
    configured: Boolean(key),
    provider: "gemini" as const,
    model: MODEL_NAME.test(configuredModel) ? configuredModel : DEFAULT_GEMINI_IDEA_MODEL,
  }
}

function fallback(query: string, context: RobotIdeaContext, reason: string, configured: boolean, model: string): RobotIdeaResult {
  const result = suggestRobotIdeas(query, { ...context, requestedProvider: "rules" })
  return {
    ...result,
    requestedProvider: "external",
    externalProviderConfigured: configured,
    externalModel: configured ? model : undefined,
    fallbackReason: reason,
  }
}

function promptFor(query: string, context: RobotIdeaContext) {
  const current = normalizeRobotConfig(context.currentConfig)
  const safeCurrent = {
    base: current.base,
    pose: current.pose,
    item: current.item,
    view: current.view,
    size: current.size,
    bodyColor: current.bodyColor,
    accentColor: current.accentColor,
  }
  return [
    "ユーザーの文章から、ボルタ／ナッティ工作サイトで実際に作れる候補をちょうど3案考えてください。",
    "候補は互いに少し違う解釈にし、既存の選択肢だけを使ってください。",
    "built-in itemにない持ち物が必要ならitemはnoneにし、customItemHintへ短い日本語名詞を入れてください。",
    "customItemHintは工作テンプレートに無さそうでも構いませんが、勝手な部品名や架空のAPI・商品名は書かないでください。",
    "タイトル・要約・理由は日本語にしてください。ユーザーが明示したボルタ/ナッティ、向き、ポーズ、色は優先してください。",
    `入力: ${query}`,
    `現在設定: ${JSON.stringify(safeCurrent)}`,
    `使用可能built-in item: ${JSON.stringify(context.availableItems ?? [])}`,
    `使用可能bodyColor: ${JSON.stringify(context.availableBodyColors ?? [])}`,
    `使用可能accentColor: ${JSON.stringify(context.availableAccentColors ?? [])}`,
  ].join("\n")
}

function outputSchema(context: RobotIdeaContext) {
  const availableItems = context.availableItems?.length ? context.availableItems : ["none", "wrench", "flower", "gear", "heart"]
  const bodyColors = context.availableBodyColors?.length ? context.availableBodyColors.map((entry) => entry.value.toLowerCase()) : ["#c9a24b"]
  const accentColors = context.availableAccentColors?.length ? context.availableAccentColors.map((entry) => entry.value.toLowerCase()) : ["#111111"]
  return {
    type: "object",
    properties: {
      candidates: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "40文字以内の候補名" },
            summary: { type: "string", description: "180文字以内の説明" },
            themeLabel: { type: "string", description: "短い日本語テーマ名" },
            base: { type: "string", enum: ["volta", "natty"] },
            pose: { type: "string", enum: ["wave", "stand", "cheer", "point"] },
            item: { type: "string", enum: [...availableItems] },
            view: { type: "string", enum: ["front", "side", "side-right", "back"] },
            bodyColor: { type: "string", enum: bodyColors },
            accentColor: { type: "string", enum: accentColors },
            customItemHint: { type: "string", description: "自作小物が不要なら空文字" },
            reasons: { type: "array", minItems: 1, maxItems: 2, items: { type: "string" } },
          },
          required: ["title", "summary", "themeLabel", "base", "pose", "item", "view", "bodyColor", "accentColor", "customItemHint", "reasons"],
        },
      },
    },
    required: ["candidates"],
  }
}

function candidateText(payload: unknown) {
  if (!payload || typeof payload !== "object") return ""
  const candidates = (payload as Record<string, unknown>).candidates
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== "object") return ""
  const content = (candidates[0] as Record<string, unknown>).content
  if (!content || typeof content !== "object") return ""
  const parts = (content as Record<string, unknown>).parts
  if (!Array.isArray(parts)) return ""
  return parts.map((part) => part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string" ? (part as Record<string, unknown>).text : "").join("")
}

export async function suggestRobotIdeasWithExternalAI(
  queryInput: string,
  context: RobotIdeaContext,
): Promise<RobotIdeaResult> {
  const query = queryInput.trim().slice(0, 240)
  const status = externalRobotIdeaStatus()
  if (!status.configured) {
    return fallback(query, context, "Gemini APIキーが未設定のため、ルールベースで提案しました。", false, status.model)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(`${GEMINI_ENDPOINT_ROOT}/${encodeURIComponent(status.model)}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey(),
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "あなたは室蘭のボルタ／ナッティ制作サイトの構成提案アシスタントです。出力JSON以外は返さないでください。" }],
        },
        contents: [{ role: "user", parts: [{ text: promptFor(query, context) }] }],
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 1300,
          responseMimeType: "application/json",
          responseSchema: outputSchema(context),
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    })

    if (!response.ok) {
      const reason = response.status === 429
        ? "Gemini無料枠またはレート上限に達したため、ルールベースで提案しました。"
        : "Gemini APIに接続できなかったため、ルールベースで提案しました。"
      return fallback(query, context, reason, true, status.model)
    }

    const payload = await response.json().catch(() => null)
    const rawText = candidateText(payload)
    const parsedJson = rawText ? JSON.parse(rawText) : null
    const drafts = parseExternalRobotIdeaDrafts(parsedJson)
    if (!drafts) {
      return fallback(query, context, "Geminiの応答形式を安全に検証できなかったため、ルールベースで提案しました。", true, status.model)
    }
    return buildExternalRobotIdeaResult(query, drafts, context, status.model)
      ?? fallback(query, context, "Geminiの提案をサイト形式へ変換できなかったため、ルールベースで提案しました。", true, status.model)
  } catch {
    return fallback(query, context, "Geminiとの通信がタイムアウトまたは失敗したため、ルールベースで提案しました。", true, status.model)
  } finally {
    clearTimeout(timer)
  }
}
