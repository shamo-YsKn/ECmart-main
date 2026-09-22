import { NextResponse } from "next/server"
import { mobileCommunityRpc, getMobileUser } from "@/lib/mobile-server"
import { communityError, UUID_PATTERN } from "@/lib/community-model"

export async function POST(request: Request) {
  // Next may use localhost in request.url even for LAN requests. Compare the
  // browser-controlled Origin with the actual Host, never an arbitrary forwarded host.
  const origin = request.headers.get("origin")
  let browserOrigin: URL
  try { browserOrigin = new URL(origin ?? "") } catch { return NextResponse.json({ error: "Invalid origin" }, { status: 403 }) }
  if (browserOrigin.origin !== origin || !["http:", "https:"].includes(browserOrigin.protocol)
    || browserOrigin.host.toLowerCase() !== request.headers.get("host")?.toLowerCase()
    || request.headers.get("sec-fetch-site") === "cross-site"
    || (new URL(request.url).protocol === "https:" && browserOrigin.protocol !== "https:")) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  }
  const form = await request.formData()
  const rawReturn = String(form.get("returnTo") ?? "")
  const url = new URL("/?tab=gallery", browserOrigin.origin)
  // Only carry known gallery parameters; never redirect to arbitrary URLs.
  const query = new URLSearchParams(rawReturn.split("?")[1] ?? "")
  for (const key of ["work", "author", "sort", "page"]) { const value = query.get(key); if (value) url.searchParams.set(key, value) }
  let ok = false
  try {
    if (!await getMobileUser()) throw { code: "P0001", message: "ログインしてからお試しください。" }
    const targetId = String(form.get("targetId") ?? "")
    if (!UUID_PATTERN.test(targetId)) throw { code: "P0001", message: "作品の指定が正しくありません。" }
    const action = form.get("action")
    if (action === "like") {
      const desired = form.get("desired")
      if (desired !== "true" && desired !== "false") throw new Error("Invalid desired state")
      await mobileCommunityRpc("set_diorama_like", { target_publication_id: targetId, desired: desired === "true" })
      url.searchParams.set("communityMessage", desired === "true" ? "いいねしました。" : "いいねを取り消しました。")
    } else if (action === "report") {
      await mobileCommunityRpc("report_community_content", { kind: "diorama", target: targetId, report_reason: String(form.get("reason") ?? "").trim() })
      url.searchParams.set("communityMessage", "通報を受け付けました。管理者が確認します。")
    } else throw new Error("Invalid action")
    ok = true
  } catch (error) { url.searchParams.set("communityMessage", communityError(error)) }
  return request.headers.get("x-machinowa-mobile-ajax") === "1"
    ? NextResponse.json({ ok, redirect: url.pathname + url.search }) : NextResponse.redirect(url, 303)
}
