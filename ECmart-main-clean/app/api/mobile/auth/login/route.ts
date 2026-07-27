import { NextResponse } from "next/server"
import { mobileSignIn, sanitizeReturnTo, setMobileAccessToken } from "@/lib/mobile-server"

export async function POST(request: Request) {
  const form = await request.formData()
  const email = String(form.get("email") ?? "").trim()
  const password = String(form.get("password") ?? "")
  const returnTo = sanitizeReturnTo(form.get("returnTo"))
  const result = await mobileSignIn(email, password)
  if (result.error || !result.token) {
    const url = new URL(returnTo, request.url)
    url.searchParams.set("loginError", result.error || "ログインできませんでした。")
    return NextResponse.redirect(url, 303)
  }
  await setMobileAccessToken(result.token)
  return NextResponse.redirect(new URL(returnTo, request.url), 303)
}
