import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { calculateCartTotals } from "@/lib/purchase"
import { readMobileCart, writeMobileCart } from "@/lib/mobile-server"
import type { CartItem } from "@/lib/types"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type GuestShipping = {
  recipient: string
  postalCode: string
  address: string
  phone: string
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

function normalizeShipping(value: unknown): GuestShipping | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  const shipping = {
    recipient: text(input.recipient, 60),
    postalCode: text(input.postalCode, 10),
    address: text(input.address, 160),
    phone: text(input.phone, 24),
  }
  if (!shipping.recipient || !shipping.address) return null
  if (!/^\d{3}-?\d{4}$/.test(shipping.postalCode)) return null
  if (!/^[0-9+()\-\s]{8,24}$/.test(shipping.phone)) return null
  return shipping
}

function safeReturnUrl(request: Request, params: Record<string, string>) {
  const url = new URL("/?tab=cart", request.url)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url
}

export async function POST(request: Request) {
  const isMobileAjax = request.headers.get("x-machinowa-mobile-ajax") === "1"
  const isAjax = isMobileAjax || request.headers.get("accept")?.includes("application/json")
  const contentType = request.headers.get("content-type") ?? ""

  let items: CartItem[] = []
  let idempotencyKey = ""
  let shipping: GuestShipping | null = null

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | { items?: CartItem[]; idempotencyKey?: string; shipping?: unknown }
      | null
    items = Array.isArray(body?.items) ? body.items : []
    idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : ""
    shipping = normalizeShipping(body?.shipping)
  } else {
    const form = await request.formData()
    items = await readMobileCart()
    idempotencyKey = String(form.get("idempotencyKey") ?? "")
    shipping = normalizeShipping({
      recipient: form.get("recipient"),
      postalCode: form.get("postalCode"),
      address: form.get("address"),
      phone: form.get("phone"),
    })
  }

  if (!UUID_PATTERN.test(idempotencyKey)) idempotencyKey = randomUUID()

  const errorResponse = (message: string, status: number) => {
    const redirectUrl = safeReturnUrl(request, { purchaseError: message, checkout: "confirm", checkoutId: idempotencyKey })
    if (isAjax) return NextResponse.json({ ok: false, error: message, redirect: `${redirectUrl.pathname}${redirectUrl.search}` }, { status })
    return NextResponse.redirect(redirectUrl, 303)
  }

  if (!shipping) {
    return errorResponse("配送先の氏名・郵便番号・住所・電話番号を確認してください。", 400)
  }

  const totals = calculateCartTotals(items)
  if (totals.validItems.length === 0) {
    return errorResponse("カートに購入できる商品がありません。", 400)
  }

  // Privacy rule for guest checkout: shipping is validated above but is never
  // written by this application to its database, cookies, session storage, or response payload.
  const result = {
    ok: true,
    guest: true,
    orderId: idempotencyKey,
    productTotal: totals.productTotal,
    shippingTotal: totals.shippingTotal,
    totalAmount: totals.totalAmount,
    pointsAwarded: 0,
    pointsBalance: 0,
    createdAt: new Date().toISOString(),
    redirect: `/?tab=cart&purchase=guest-complete&order=${encodeURIComponent(idempotencyKey)}&total=${totals.totalAmount}`,
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    await writeMobileCart([])
  }

  if (isAjax) return NextResponse.json(result)

  return NextResponse.redirect(new URL(result.redirect, request.url), 303)
}
