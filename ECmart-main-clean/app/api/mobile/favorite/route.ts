import { NextResponse } from "next/server"
import { sanitizeReturnTo, toggleMobileFavorite } from "@/lib/mobile-server"

export async function POST(request: Request) {
  const form = await request.formData()
  const productId = String(form.get("productId") ?? "")
  const returnTo = sanitizeReturnTo(form.get("returnTo"))
  const ok = await toggleMobileFavorite(productId)
  const url = new URL(returnTo, request.url)
  if (!ok) url.searchParams.set("favoriteError", "お気に入りを更新できませんでした。ログイン状態を確認してください。")
  return request.headers.get("x-machinowa-mobile-ajax") === "1"
    ? NextResponse.json({ ok, redirect: url.pathname + url.search })
    : NextResponse.redirect(url, 303)
}
