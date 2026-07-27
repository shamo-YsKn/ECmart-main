import { NextResponse } from "next/server"
import { sanitizeReturnTo, setMobileAccessToken } from "@/lib/mobile-server"

export async function POST(request: Request) {
  const form = await request.formData()
  await setMobileAccessToken(null)
  return NextResponse.redirect(new URL(sanitizeReturnTo(form.get("returnTo")), request.url), 303)
}
