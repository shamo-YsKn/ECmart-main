import { NextResponse } from "next/server"
import { sanitizeReturnTo, saveMobileRobot } from "@/lib/mobile-server"
import { normalizeRobotConfig } from "@/lib/robot-config"

export async function POST(request: Request) {
  const form = await request.formData()
  const returnTo = sanitizeReturnTo(form.get("returnTo"))
  const config = normalizeRobotConfig({
    base: form.get("base"),
    view: form.get("view"),
    pose: form.get("pose"),
    item: form.get("item"),
    size: form.get("size"),
    bodyColor: form.get("bodyColor"),
    accentColor: form.get("accentColor"),
    name: form.get("name"),
  })
  const ok = await saveMobileRobot(config)
  const url = new URL(returnTo, request.url)
  url.searchParams.set(ok ? "robotSaved" : "robotError", ok ? "1" : "ログイン後に保存してください。")
  return request.headers.get("x-machinowa-mobile-ajax") === "1"
    ? NextResponse.json({ ok, redirect: url.pathname + url.search })
    : NextResponse.redirect(url, 303)
}
