import { NextResponse } from "next/server"
import { getMobileWorkbenchContext } from "@/lib/mobile-server"

export async function GET() {
  const context = await getMobileWorkbenchContext()
  return NextResponse.json(context, { headers: { "Cache-Control": "no-store" } })
}
