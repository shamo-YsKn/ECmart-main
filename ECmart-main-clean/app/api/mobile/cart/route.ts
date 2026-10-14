import { NextResponse } from "next/server"
import { getProduct } from "@/lib/data"
import { readMobileCart, sanitizeReturnTo, writeMobileCart } from "@/lib/mobile-server"

function relativeRedirect(location: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
    },
  })
}

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const action = String(form.get("action") ?? "add")
    const productId = String(form.get("productId") ?? "")
    const returnTo = sanitizeReturnTo(form.get("returnTo"))
    let items = await readMobileCart()

    if (action === "clear") {
      items = []
    } else if (getProduct(productId)) {
      const current = items.find((item) => item.productId === productId)?.quantity ?? 0
      const requested = Number(form.get("quantity"))
      const quantity = action === "add" ? current + 1 : action === "remove" ? 0 : requested
      if (!Number.isFinite(quantity) || quantity <= 0) items = items.filter((item) => item.productId !== productId)
      else {
        const next = Math.min(99, Math.floor(quantity))
        items = current
          ? items.map((item) => item.productId === productId ? { ...item, quantity: next } : item)
          : [...items, { productId, quantity: next }]
      }
    }

    await writeMobileCart(items)
    return request.headers.get("x-machinowa-mobile-ajax") === "1"
      ? NextResponse.json({ ok: true, redirect: returnTo }, { headers: { "Cache-Control": "no-store" } })
      : relativeRedirect(returnTo)
  } catch {
    const fallback = "/?tab=cart&cartError=1"
    return request.headers.get("x-machinowa-mobile-ajax") === "1"
      ? NextResponse.json({ ok: false, redirect: fallback, error: "カートを更新できませんでした。" }, { status: 400 })
      : relativeRedirect(fallback)
  }
}
