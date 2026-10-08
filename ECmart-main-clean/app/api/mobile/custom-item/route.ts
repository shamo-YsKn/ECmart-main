import { NextResponse } from "next/server"
import type { CustomItemDocument } from "@/lib/creation-model"
import { normalizeCustomItemDocument } from "@/lib/custom-item-model"
import { saveMobileCustomItem } from "@/lib/mobile-server"

export async function POST(request: Request) {
  let body: { document?: unknown; itemId?: unknown; asNew?: unknown }
  try {
    body = await request.json() as { document?: unknown; itemId?: unknown; asNew?: unknown }
  } catch {
    return NextResponse.json({ ok: false, error: "保存データを読み取れませんでした。" }, { status: 400 })
  }

  const document = normalizeCustomItemDocument(body.document) as CustomItemDocument
  const itemId = body.asNew === true ? undefined : (typeof body.itemId === "string" ? body.itemId : undefined)
  const result = await saveMobileCustomItem(document, itemId)
  if (result.error || !result.item) {
    return NextResponse.json({ ok: false, error: result.error ?? "保存できませんでした。" }, { status: 400 })
  }
  return NextResponse.json({ ok: true, item: result.item })
}
