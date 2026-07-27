import { NextResponse } from "next/server"
import { sanitizeReturnTo, setMobileAccessToken } from "@/lib/mobile-server"

export async function POST(request: Request) {
  const form = await request.formData()
  await setMobileAccessToken(null)
  const returnTo = sanitizeReturnTo(form.get("returnTo"))
  return request.headers.get("x-machinowa-mobile-ajax") === "1"
    ? NextResponse.json({ ok: true, redirect: returnTo })
    : NextResponse.redirect(new URL(returnTo, request.url), 303)
}
