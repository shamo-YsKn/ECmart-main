import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { GACHA_COST, getGachaReward } from "@/lib/gacha"
import { getMobileAccessToken } from "@/lib/mobile-server"
import type { GachaSpinResult } from "@/lib/types"

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

function resultRedirect(result: GachaSpinResult) {
  const search = new URLSearchParams({
    tab: "gacha",
    stage: "result",
    reward: result.rewardId,
    rarity: result.rarity,
    quantity: String(result.quantity),
    balance: String(result.pointsBalance),
    duplicate: result.duplicate ? "1" : "0",
  })
  return `/?${search.toString()}`
}

function errorRedirect(message: string, rollId: string) {
  const search = new URLSearchParams({
    tab: "gacha",
    stage: "ready",
    rollId,
    gachaError: message,
  })
  return `/?${search.toString()}`
}

export async function POST(request: Request) {
  const isMobileAjax = request.headers.get("x-machinowa-mobile-ajax") === "1"
  const wantsJson = isMobileAjax || request.headers.get("accept")?.includes("application/json")
  const contentType = request.headers.get("content-type") ?? ""

  let rollId = ""
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { rollId?: string } | null
    rollId = typeof body?.rollId === "string" ? body.rollId : ""
  } else {
    const form = await request.formData()
    rollId = String(form.get("rollId") ?? "")
  }
  if (!UUID_PATTERN.test(rollId)) rollId = randomUUID()

  const fail = (message: string, status: number) => {
    const redirect = errorRedirect(message, rollId)
    return wantsJson
      ? NextResponse.json({ ok: false, error: message, redirect }, { status })
      : NextResponse.redirect(new URL(redirect, request.url), 303)
  }

  const authorization = request.headers.get("authorization")
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  const accessToken = bearerToken || (await getMobileAccessToken())
  if (!accessToken) return fail("ガチャを回すにはログインが必要です。", 401)

  const { url, publishableKey, serviceRoleKey } = configuredSupabase()
  if (!url || !publishableKey || !serviceRoleKey) {
    return fail("ガチャ機能のSupabaseサーバー設定が完了していません。", 503)
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
      return fail("ログイン情報を確認できませんでした。もう一度ログインしてください。", 401)
    }

    const rpcResponse = await fetchWithTimeout(
      `${url}/rest/v1/rpc/spin_gacha_for_user`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_roll_id: rollId, p_user_id: userData.id }),
      },
      12000,
    )

    const rpcPayload = (await rpcResponse.json().catch(() => null)) as
      | Array<{
          roll_id?: string
          reward_id?: string
          reward_category?: string
          reward_label?: string
          reward_value?: string
          reward_rarity?: string
          inventory_quantity?: number
          points_balance?: number
          was_duplicate?: boolean
        }>
      | { message?: string }
      | null

    if (!rpcResponse.ok) {
      const rawMessage =
        rpcPayload && !Array.isArray(rpcPayload) && rpcPayload.message
          ? rpcPayload.message
          : ""
      if (rawMessage.includes("insufficient_points")) {
        return fail(`ポイントが足りません。ガチャ1回には${GACHA_COST}pt必要です。`, 400)
      }
      const message = rawMessage
        ? `ガチャ処理を完了できませんでした：${rawMessage}`
        : "ガチャ処理を完了できませんでした。Supabaseのガチャ設定を確認してください。"
      return fail(message, 500)
    }

    const row = Array.isArray(rpcPayload) ? rpcPayload[0] : null
    const catalogReward = row?.reward_id ? getGachaReward(row.reward_id) : null
    if (!row?.roll_id || !row.reward_id || !catalogReward) {
      return fail("ガチャ結果を読み取れませんでした。", 500)
    }

    const result: GachaSpinResult = {
      rollId: row.roll_id,
      rewardId: row.reward_id,
      category: catalogReward.category,
      label: row.reward_label || catalogReward.label,
      value: row.reward_value || catalogReward.value,
      rarity:
        row.reward_rarity === "rare" || row.reward_rarity === "special"
          ? row.reward_rarity
          : "normal",
      quantity: Math.max(1, Number(row.inventory_quantity) || 1),
      pointsBalance: Math.max(0, Number(row.points_balance) || 0),
      duplicate: Boolean(row.was_duplicate),
    }

    const redirect = resultRedirect(result)
    return wantsJson
      ? NextResponse.json({ ok: true, ...result, redirect })
      : NextResponse.redirect(new URL(redirect, request.url), 303)
  } catch {
    return fail("ガチャ処理がタイムアウトしました。通信状態を確認してください。", 504)
  }
}
