import "server-only"

import { cookies } from "next/headers"
import type { CartItem, GachaInventoryItem, PurchaseOrder, RobotConfig, SavedRobot } from "@/lib/types"
import { normalizeRobotConfig, parseSavedRobotRow, sanitizeRobotName } from "@/lib/robot-config"
import { parseMuralPostRow, type MuralPost } from "@/lib/mural-model"

const ACCESS_COOKIE = "machinowa_mobile_access"
const CART_COOKIE = "machinowa_mobile_cart"

function supabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "",
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  }
}

function authHeaders(accessToken?: string) {
  const { key } = supabaseConfig()
  return {
    apikey: key,
    Authorization: `Bearer ${accessToken || key}`,
    "Content-Type": "application/json",
  }
}

async function safeFetch(input: string, init?: RequestInit, timeoutMs = 6000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal, cache: "no-store" })
  } finally {
    clearTimeout(timer)
  }
}

export function sanitizeReturnTo(value: FormDataEntryValue | string | null | undefined) {
  const text = typeof value === "string" ? value : ""
  if (!text.startsWith("/") || text.startsWith("//")) return "/?tab=home"
  return text
}

export async function getMobileAccessToken() {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? null
}

export async function setMobileAccessToken(token: string | null) {
  const store = await cookies()
  if (!token) {
    store.delete(ACCESS_COOKIE)
    return
  }
  store.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  })
}

export type MobileUser = { id: string; email?: string | null }
export type MobileProfile = { user_id: string; display_name: string | null; bio: string | null; points: number }

export async function getMobileUser(): Promise<MobileUser | null> {
  const token = await getMobileAccessToken()
  const { url, key } = supabaseConfig()
  if (!token || !url || !key) return null
  try {
    const response = await safeFetch(`${url}/auth/v1/user`, {
      headers: authHeaders(token),
    }, 4500)
    if (!response.ok) return null
    const data = await response.json() as { id?: string; email?: string | null }
    return data.id ? { id: data.id, email: data.email } : null
  } catch {
    return null
  }
}

async function restGet<T>(path: string, token: string): Promise<T | null> {
  const { url, key } = supabaseConfig()
  if (!url || !key) return null
  try {
    const response = await safeFetch(`${url}/rest/v1/${path}`, {
      headers: authHeaders(token),
    }, 5000)
    if (!response.ok) return null
    return await response.json() as T
  } catch {
    return null
  }
}


async function restPublicGet<T>(path: string): Promise<T | null> {
  const { url, key } = supabaseConfig()
  if (!url || !key) return null
  try {
    const response = await safeFetch(`${url}/rest/v1/${path}`, {
      headers: authHeaders(),
    }, 5000)
    if (!response.ok) return null
    return await response.json() as T
  } catch {
    return null
  }
}

export async function getMobileMuralPosts(spotId: string, muralVariant = "default"): Promise<MuralPost[]> {
  const rows = await restPublicGet<unknown[]>(
    `mural_posts?select=id,user_id,spot_id,saved_robot_id,author_name,robot_name,robot_config,robot_view,mural_variant,custom_item_document,review,position_x,position_y,scale,rotation_deg,created_at,updated_at&spot_id=eq.${encodeURIComponent(spotId)}&mural_variant=eq.${encodeURIComponent(muralVariant)}&order=created_at.desc&limit=60`,
  )
  return (rows ?? [])
    .map((row) => parseMuralPostRow(row))
    .filter((post): post is MuralPost => post !== null)
}

export async function getMobileAccountData() {
  const user = await getMobileUser()
  const token = await getMobileAccessToken()
  if (!user || !token) {
    return {
      user: null,
      profile: null,
      favorites: new Set<string>(),
      robots: [] as SavedRobot[],
      gachaInventory: [] as GachaInventoryItem[],
    }
  }

  const [profiles, favorites, robots, inventoryRows] = await Promise.all([
    restGet<MobileProfile[]>(`profiles?select=user_id,display_name,bio,points&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, token),
    restGet<Array<{ product_id: string }>>(`favorites?select=product_id&user_id=eq.${encodeURIComponent(user.id)}`, token),
    restGet<SavedRobot[]>(`saved_robots?select=id,user_id,name,config,is_avatar,created_at,updated_at&user_id=eq.${encodeURIComponent(user.id)}&order=updated_at.desc`, token),
    restGet<Array<{
      reward_id: string
      quantity: number
      first_acquired_at: string
      last_acquired_at: string
    }>>(`user_gacha_inventory?select=reward_id,quantity,first_acquired_at,last_acquired_at&user_id=eq.${encodeURIComponent(user.id)}&order=last_acquired_at.desc`, token),
  ])

  const gachaInventory: GachaInventoryItem[] = (inventoryRows ?? []).map((row) => ({
    rewardId: row.reward_id,
    quantity: Math.max(1, Number(row.quantity) || 1),
    firstAcquiredAt: row.first_acquired_at,
    lastAcquiredAt: row.last_acquired_at,
  }))

  return {
    user,
    profile: profiles?.[0] ?? null,
    favorites: new Set((favorites ?? []).map((item) => item.product_id)),
    robots: Array.isArray(robots)
      ? robots.map((row) => parseSavedRobotRow(row)).filter((row): row is SavedRobot => row !== null)
      : [],
    gachaInventory,
  }
}

export async function mobileSignIn(email: string, password: string) {
  const { url, key } = supabaseConfig()
  if (!url || !key) return { error: "Supabaseの設定がありません。" as string | null, token: null as string | null }
  try {
    const response = await safeFetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }, 10000)
    const data = await response.json().catch(() => ({})) as { access_token?: string; error_description?: string; msg?: string }
    if (!response.ok || !data.access_token) {
      const raw = (data.error_description || data.msg || "ログインできませんでした。").toLowerCase()
      const error = raw.includes("invalid login") || raw.includes("invalid credentials")
        ? "メールアドレスまたはパスワードが違います。"
        : raw.includes("email not confirmed")
          ? "メールアドレスの確認が完了していません。"
          : data.error_description || data.msg || "ログインできませんでした。"
      return { error, token: null }
    }
    return { error: null, token: data.access_token }
  } catch {
    return { error: "ログイン通信がタイムアウトしました。", token: null }
  }
}

export async function toggleMobileFavorite(productId: string) {
  const token = await getMobileAccessToken()
  const user = await getMobileUser()
  const { url, key } = supabaseConfig()
  if (!token || !user || !url || !key) return false

  const existing = await restGet<Array<{ product_id: string }>>(
    `favorites?select=product_id&user_id=eq.${encodeURIComponent(user.id)}&product_id=eq.${encodeURIComponent(productId)}`,
    token,
  )
  const hasFavorite = Boolean(existing?.length)
  try {
    const endpoint = `${url}/rest/v1/favorites?user_id=eq.${encodeURIComponent(user.id)}&product_id=eq.${encodeURIComponent(productId)}`
    const response = hasFavorite
      ? await safeFetch(endpoint, { method: "DELETE", headers: authHeaders(token) })
      : await safeFetch(`${url}/rest/v1/favorites`, {
          method: "POST",
          headers: { ...authHeaders(token), Prefer: "return=minimal" },
          body: JSON.stringify({ user_id: user.id, product_id: productId }),
        })
    return response.ok
  } catch {
    return false
  }
}

export async function saveMobileRobot(config: RobotConfig) {
  const token = await getMobileAccessToken()
  const user = await getMobileUser()
  const { url, key } = supabaseConfig()
  if (!token || !user || !url || !key) return false
  const cleanName = sanitizeRobotName(config.name, config.base)
  const cleanConfig = normalizeRobotConfig({ ...config, name: cleanName })
  try {
    const response = await safeFetch(`${url}/rest/v1/saved_robots`, {
      method: "POST",
      headers: { ...authHeaders(token), Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: user.id,
        name: cleanName,
        config: cleanConfig,
      }),
    }, 7000)
    return response.ok
  } catch {
    return false
  }
}

export async function readMobileCart(): Promise<CartItem[]> {
  const raw = (await cookies()).get(CART_COOKIE)?.value
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is CartItem => Boolean(item && typeof item.productId === "string" && Number.isFinite(item.quantity)))
      .map((item) => ({ productId: item.productId, quantity: Math.max(0, Math.min(99, Math.floor(item.quantity))) }))
      .filter((item) => item.quantity > 0)
  } catch {
    return []
  }
}

export async function writeMobileCart(items: CartItem[]) {
  const store = await cookies()
  store.set(CART_COOKIE, JSON.stringify(items), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  })
}


export async function getMobileOrder(orderId: string): Promise<PurchaseOrder | null> {
  const token = await getMobileAccessToken()
  const user = await getMobileUser()
  if (!token || !user || !orderId) return null

  const rows = await restGet<Array<{
    id: string
    user_id: string
    status: "completed"
    product_total: number
    shipping_total: number
    total_amount: number
    points_awarded: number
    created_at: string
  }>>(
    `orders?select=id,user_id,status,product_total,shipping_total,total_amount,points_awarded,created_at&id=eq.${encodeURIComponent(orderId)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    token,
  )
  const row = rows?.[0]
  if (!row) return null

  return {
    orderId: row.id,
    userId: row.user_id,
    status: row.status,
    productTotal: row.product_total,
    shippingTotal: row.shipping_total,
    totalAmount: row.total_amount,
    pointsAwarded: row.points_awarded,
    pointsBalance: 0,
    createdAt: row.created_at,
  }
}
