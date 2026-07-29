import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { calculateCartTotals } from "@/lib/purchase"
import { getMobileAccessToken, readMobileCart, writeMobileCart } from "@/lib/mobile-server"
import type { CartItem } from "@/lib/types"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function configuredSupabase() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "",
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  }
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal, cache: "no-store" })
  } finally {
    clearTimeout(timer)
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status })
}

function safeReturnUrl(request: Request, error: string, idempotencyKey?: string) {
  const url = new URL("/?tab=cart", request.url)
  url.searchParams.set("purchaseError", error)
  if (idempotencyKey) {
    url.searchParams.set("checkout", "confirm")
    url.searchParams.set("checkoutId", idempotencyKey)
  }
  return url
}

export async function POST(request: Request) {
  const isMobileAjax = request.headers.get("x-machinowa-mobile-ajax") === "1"
  const isAjax = isMobileAjax || request.headers.get("accept")?.includes("application/json")
  const contentType = request.headers.get("content-type") ?? ""

  let items: CartItem[] = []
  let idempotencyKey = ""
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | { items?: CartItem[]; idempotencyKey?: string }
      | null
    items = Array.isArray(body?.items) ? body.items : []
    idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : ""
  } else {
    const form = await request.formData()
    items = await readMobileCart()
    idempotencyKey = String(form.get("idempotencyKey") ?? "")
  }

  if (!UUID_PATTERN.test(idempotencyKey)) idempotencyKey = randomUUID()

  const errorResponse = (message: string, status: number) => {
    const redirectUrl = safeReturnUrl(request, message, idempotencyKey)
    if (isMobileAjax) {
      return NextResponse.json(
        {
          ok: false,
          error: message,
          redirect: `${redirectUrl.pathname}${redirectUrl.search}`,
        },
        { status },
      )
    }
    return isAjax
      ? jsonError(message, status)
      : NextResponse.redirect(redirectUrl, 303)
  }

  const authorization = request.headers.get("authorization")
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  const accessToken = bearerToken || (await getMobileAccessToken())
  if (!accessToken) {
    const message = "購入するにはログインが必要です。"
    return errorResponse(message, 401)
  }

  const { url, publishableKey, serviceRoleKey } = configuredSupabase()
  if (!url || !publishableKey || !serviceRoleKey) {
    const message = "購入機能のSupabaseサーバー設定が完了していません。"
    return errorResponse(message, 503)
  }

  const totals = calculateCartTotals(items)
  if (totals.validItems.length === 0) {
    const message = "カートに購入できる商品がありません。"
    return errorResponse(message, 400)
  }

  try {
    const userResponse = await fetchWithTimeout(
      `${url}/auth/v1/user`,
      {
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${accessToken}`,
        },
      },
      7000,
    )
    const userData = (await userResponse.json().catch(() => null)) as { id?: string } | null
    if (!userResponse.ok || !userData?.id) {
      const message = "ログイン情報を確認できませんでした。もう一度ログインしてください。"
      return errorResponse(message, 401)
    }

    const orderItems = totals.validItems.map(({ product, quantity }) => ({
      product_id: product.id,
      product_name: product.name,
      shop_id: product.shopId,
      unit_price: product.price,
      quantity,
      line_total: product.price * quantity,
    }))

    const rpcResponse = await fetchWithTimeout(
      `${url}/rest/v1/rpc/complete_purchase_for_user`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_order_id: idempotencyKey,
          p_user_id: userData.id,
          p_items: orderItems,
          p_product_total: totals.productTotal,
          p_shipping_total: totals.shippingTotal,
          p_total_amount: totals.totalAmount,
          p_points_awarded: totals.pointsAwarded,
        }),
      },
      12000,
    )

    const rpcPayload = (await rpcResponse.json().catch(() => null)) as
      | Array<{
          order_id?: string
          product_total?: number
          shipping_total?: number
          total_amount?: number
          points_awarded?: number
          points_balance?: number
          created_at?: string
        }>
      | { message?: string }
      | null

    if (!rpcResponse.ok) {
      const message =
        rpcPayload && !Array.isArray(rpcPayload) && rpcPayload.message
          ? `購入処理を完了できませんでした：${rpcPayload.message}`
          : "購入処理を完了できませんでした。Supabaseの購入設定を確認してください。"
      return errorResponse(message, 500)
    }

    const row = Array.isArray(rpcPayload) ? rpcPayload[0] : null
    if (!row?.order_id) {
      const message = "購入結果を読み取れませんでした。"
      return errorResponse(message, 500)
    }

    // Mobile cart lives in an httpOnly cookie. Desktop clears its React state
    // after receiving this successful response.
    if (!bearerToken) await writeMobileCart([])

    const result = {
      ok: true,
      orderId: row.order_id,
      productTotal: Number(row.product_total) || totals.productTotal,
      shippingTotal: Number(row.shipping_total) || totals.shippingTotal,
      totalAmount: Number(row.total_amount) || totals.totalAmount,
      pointsAwarded: Number(row.points_awarded) || totals.pointsAwarded,
      pointsBalance: Number(row.points_balance) || 0,
      createdAt: row.created_at,
      redirect: `/?tab=cart&purchase=complete&order=${encodeURIComponent(row.order_id)}`,
    }

    return isAjax
      ? NextResponse.json(result)
      : NextResponse.redirect(new URL(result.redirect, request.url), 303)
  } catch {
    const message = "購入処理がタイムアウトしました。通信状態を確認してください。"
    return errorResponse(message, 504)
  }
}
