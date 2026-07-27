import { NextResponse } from "next/server"
import type { RobotBase, RobotItem, RobotPose, RobotView } from "@/lib/types"
import { sanitizeReturnTo, saveMobileRobot } from "@/lib/mobile-server"

export async function POST(request: Request) {
  const form = await request.formData()
  const returnTo = sanitizeReturnTo(form.get("returnTo"))
  const base = String(form.get("base")) as RobotBase
  const view = String(form.get("view")) as RobotView
  const pose = String(form.get("pose")) as RobotPose
  const item = String(form.get("item")) as RobotItem
  const size = Math.max(20, Math.min(90, Number(form.get("size")) || 50))
  const config = {
    base: base === "natty" ? "natty" as const : "volta" as const,
    view: (["front", "side", "back"] as string[]).includes(view) ? view : "front" as const,
    pose: (["wave", "stand", "cheer", "point"] as string[]).includes(pose) ? pose : "stand" as const,
    item: (["none", "wrench", "flower", "gear", "heart"] as string[]).includes(item) ? item : "none" as const,
    size,
    bodyColor: String(form.get("bodyColor") || "#8a8a8a"),
    accentColor: String(form.get("accentColor") || "#e8842f"),
    name: String(form.get("name") || (base === "natty" ? "ナッティ" : "ボルタ")).slice(0, 40),
  }
  const ok = await saveMobileRobot(config)
  const url = new URL(returnTo, request.url)
  url.searchParams.set(ok ? "robotSaved" : "robotError", ok ? "1" : "ログイン後に保存してください。")
  return request.headers.get("x-machinowa-mobile-ajax") === "1"
    ? NextResponse.json({ ok, redirect: url.pathname + url.search })
    : NextResponse.redirect(url, 303)
}
