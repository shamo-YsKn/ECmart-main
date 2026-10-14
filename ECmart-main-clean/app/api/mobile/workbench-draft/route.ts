import { normalizeCustomItemDocument, CUSTOM_ITEM_DRAFT_KEY } from "@/lib/custom-item-model"
import { normalizeRobotConfig } from "@/lib/robot-config"

function htmlEscapeJson(value: string) {
  return value
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

function parseJson(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return undefined
  try { return JSON.parse(value) as unknown } catch { return undefined }
}

export async function POST(request: Request) {
  const form = await request.formData()
  const raw = form.get("document")
  const itemId = typeof form.get("itemId") === "string" ? String(form.get("itemId")).slice(0, 120) : undefined
  const sourceRaw = form.get("source")
  const source = sourceRaw === "idea-assistant"
    ? "idea-assistant"
    : sourceRaw === "mobile-robot"
      ? "mobile-robot"
      : "mobile-account"
  const document = normalizeCustomItemDocument(parseJson(raw))
  const robotConfigRaw = parseJson(form.get("robotConfig"))
  const returnRobotConfig = robotConfigRaw ? normalizeRobotConfig(robotConfigRaw) : undefined
  const payload = htmlEscapeJson(JSON.stringify({
    id: itemId || undefined,
    document,
    source,
    ...(returnRobotConfig ? { returnRobotConfig } : {}),
  }))
  const key = JSON.stringify(CUSTOM_ITEM_DRAFT_KEY)
  const target = JSON.stringify("/?tab=workbench&mobile=1")

  return new Response(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>工作台へ移動</title></head><body><p>工作案を読み込んでいます…</p><script>try{sessionStorage.setItem(${key},${JSON.stringify(payload)});location.replace(${target});}catch(e){location.replace(${target});}</script></body></html>`, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
