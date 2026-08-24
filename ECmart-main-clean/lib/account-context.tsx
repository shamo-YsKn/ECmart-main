"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import type {
  CartItem,
  GachaInventoryItem,
  GachaSpinResult,
  PurchaseResult,
  RobotConfig,
  SavedRobot,
} from "@/lib/types"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { getGachaReward } from "@/lib/gacha"
import { normalizeRobotConfig, parseSavedRobotRow, sanitizeRobotName } from "@/lib/robot-config"
import { normalizeRobotHeldItem } from "@/lib/robot-held-item"
import type { CustomItemDocument } from "@/lib/creation-model"
import {
  normalizeCustomItemDocument,
  parseSavedCustomItemRow,
  sanitizeCustomItemName,
  type SavedCustomItem,
} from "@/lib/custom-item-model"

export interface Profile {
  user_id: string
  display_name: string | null
  bio: string | null
  points: number
  created_at?: string
  updated_at?: string
}

type AccountResult = {
  error: string | null
  needsEmailConfirmation?: boolean
}

type RobotAccountResult = AccountResult & {
  robot?: SavedRobot
}

type CustomItemAccountResult = AccountResult & {
  item?: SavedCustomItem
}

type PurchaseAccountResult = AccountResult & {
  purchase?: PurchaseResult
}

type GachaAccountResult = AccountResult & {
  spin?: GachaSpinResult
}

interface AccountContextValue {
  configured: boolean
  loading: boolean
  accountLoadError: string | null
  user: User | null
  profile: Profile | null
  favoriteProductIds: Set<string>
  savedRobots: SavedRobot[]
  avatarRobot: SavedRobot | null
  gachaInventory: GachaInventoryItem[]
  savedCustomItems: SavedCustomItem[]
  robotStorageReady: boolean
  robotStorageError: string | null
  customItemStorageReady: boolean
  customItemStorageError: string | null
  signUp: (email: string, password: string, displayName: string) => Promise<AccountResult>
  signIn: (email: string, password: string) => Promise<AccountResult>
  signOut: () => Promise<AccountResult>
  saveProfile: (displayName: string, bio: string) => Promise<AccountResult>
  toggleFavorite: (productId: string) => Promise<AccountResult>
  saveRobot: (config: RobotConfig, robotId?: string) => Promise<RobotAccountResult>
  deleteRobot: (robotId: string) => Promise<AccountResult>
  saveCustomItem: (document: CustomItemDocument, itemId?: string) => Promise<CustomItemAccountResult>
  deleteCustomItem: (itemId: string) => Promise<AccountResult>
  setAvatarRobot: (robotId: string | null) => Promise<AccountResult>
  purchaseCart: (items: CartItem[], idempotencyKey: string) => Promise<PurchaseAccountResult>
  spinGacha: (rollId: string) => Promise<GachaAccountResult>
  refreshAccount: () => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}


const ACTIVE_LOGIN_KEY = "machinowa:active-login"

function setActiveLoginMarker(active: boolean) {
  try {
    if (active) window.sessionStorage.setItem(ACTIVE_LOGIN_KEY, "1")
    else window.sessionStorage.removeItem(ACTIVE_LOGIN_KEY)
  } catch {
    // sessionStorage can be unavailable in restricted browser modes.
  }
}

function hasActiveLoginMarker() {
  try {
    return window.sessionStorage.getItem(ACTIVE_LOGIN_KEY) === "1"
  } catch {
    return false
  }
}

function readableAuthError(error: { code?: string; message: string }) {
  switch (error.code) {
    case "email_not_confirmed":
      return "メールアドレスの確認が完了していません。確認メール内のリンクを開いてください。"
    case "invalid_credentials":
      return "メールアドレスまたはパスワードが違います。"
    case "user_already_exists":
    case "email_exists":
      return "このメールアドレスはすでに登録されています。"
    case "weak_password":
      return "パスワードは6文字以上で入力してください。"
    case "over_email_send_rate_limit":
      return "確認メールの送信回数が上限に達しました。少し時間を置いてください。"
  }

  const lower = error.message.toLowerCase()
  if (lower.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが違います。"
  }
  if (lower.includes("email not confirmed")) {
    return "メールアドレスの確認が完了していません。確認メール内のリンクを開いてください。"
  }
  if (lower.includes("user already registered")) {
    return "このメールアドレスはすでに登録されています。"
  }
  if (lower.includes("password should be")) {
    return "パスワードは6文字以上で入力してください。"
  }
  if (lower.includes("email rate limit")) {
    return "確認メールの送信回数が上限に達しました。少し時間を置いてください。"
  }

  return error.message
}


function isMissingRobotStorage(error: { code?: string; message: string }) {
  return (
    error.code === "42P01" ||
    error.message.toLowerCase().includes("saved_robots") ||
    error.message.toLowerCase().includes("set_robot_avatar")
  )
}

function robotStorageMessage(error?: { message?: string } | null) {
  if (!error?.message) {
    return "ロボット保存用のSupabase設定がまだ完了していません。"
  }
  return `ロボット保存用のSupabase設定を確認してください：${error.message}`
}

function isMissingCustomItemStorage(error: { code?: string; message: string }) {
  return error.code === "42P01" || error.message.toLowerCase().includes("custom_items")
}

function customItemStorageMessage(error?: { message?: string } | null) {
  if (!error?.message) return "自作アイテム保存用のSupabase設定がまだ完了していません。"
  return `自作アイテム保存用のSupabase設定を確認してください：${error.message}`
}


function withTimeout<T>(promiseLike: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs)
    Promise.resolve(promiseLike).then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}


async function retryRequest<T>(
  request: () => PromiseLike<T>,
  label: string,
  attempts = 3,
  timeoutMs = 9000,
): Promise<T> {
  let lastError: unknown = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await withTimeout(request(), timeoutMs, `${label} ${attempt + 1}`)
    } catch (error) {
      lastError = error
      if (attempt + 1 < attempts) {
        await new Promise<void>((resolve) =>
          window.setTimeout(resolve, 350 * (attempt + 1)),
        )
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${label} failed`)
}

export function AccountProvider({ children }: { children: ReactNode }) {
  // Do not create Supabase while the application is hydrating. On mobile LAN
  // access (plain http://IP:port), authentication/storage capabilities differ
  // from localhost and can fail before React has attached any click handlers.
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [accountLoadError, setAccountLoadError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [savedRobots, setSavedRobots] = useState<SavedRobot[]>([])
  const [gachaInventory, setGachaInventory] = useState<GachaInventoryItem[]>([])
  const [savedCustomItems, setSavedCustomItems] = useState<SavedCustomItem[]>([])
  const [robotStorageReady, setRobotStorageReady] = useState(true)
  const [robotStorageError, setRobotStorageError] = useState<string | null>(null)
  const [customItemStorageReady, setCustomItemStorageReady] = useState(true)
  const [customItemStorageError, setCustomItemStorageError] = useState<string | null>(null)

  const getSupabase = useCallback(async () => {
    if (supabaseRef.current) return supabaseRef.current
    try {
      const client = await createClient()
      supabaseRef.current = client
      return client
    } catch (error) {
      console.error("Supabase client initialization failed", error)
      setAccountLoadError(
        "このブラウザではアカウント機能を初期化できませんでした。HTTPS環境または別のブラウザでお試しください。",
      )
      return null
    }
  }, [])

  const clearLocalAccount = useCallback(() => {
    setUser(null)
    setProfile(null)
    setFavoriteProductIds(new Set())
    setSavedRobots([])
    setGachaInventory([])
    setSavedCustomItems([])
    setRobotStorageReady(true)
    setRobotStorageError(null)
    setCustomItemStorageReady(true)
    setCustomItemStorageError(null)
  }, [])

  const loadUserData = useCallback(
    async (nextUser: User | null) => {
      setUser(nextUser)

      if (!nextUser) {
        clearLocalAccount()
        return
      }

      const supabase = await getSupabase()
      if (!supabase) {
        clearLocalAccount()
        return
      }

      const [profileResult, favoritesResult, robotsResult, inventoryResult, customItemsResult] = await Promise.allSettled([
        retryRequest(
          () =>
            supabase
              .from("profiles")
              .select("user_id, display_name, bio, points, created_at, updated_at")
              .eq("user_id", nextUser.id)
              .maybeSingle(),
          "profile",
        ),
        retryRequest(
          () =>
            supabase
              .from("favorites")
              .select("product_id")
              .eq("user_id", nextUser.id),
          "favorites",
        ),
        retryRequest(
          () =>
            supabase
              .from("saved_robots")
              .select("id, user_id, name, config, is_avatar, created_at, updated_at")
              .eq("user_id", nextUser.id)
              .order("updated_at", { ascending: false }),
          "robots",
        ),
        retryRequest(
          () =>
            supabase
              .from("user_gacha_inventory")
              .select("reward_id, quantity, first_acquired_at, last_acquired_at")
              .eq("user_id", nextUser.id)
              .order("last_acquired_at", { ascending: false }),
          "gacha inventory",
        ),
        retryRequest(
          () =>
            supabase
              .from("custom_items")
              .select("id, user_id, name, document, created_at, updated_at")
              .eq("user_id", nextUser.id)
              .order("updated_at", { ascending: false }),
          "custom items",
        ),
      ])

      const profileResponse = profileResult.status === "fulfilled" ? profileResult.value : null
      const favoritesResponse = favoritesResult.status === "fulfilled" ? favoritesResult.value : null
      const robotsResponse = robotsResult.status === "fulfilled" ? robotsResult.value : null
      const inventoryResponse = inventoryResult.status === "fulfilled" ? inventoryResult.value : null
      const customItemsResponse = customItemsResult.status === "fulfilled" ? customItemsResult.value : null

      if (profileResponse && !profileResponse.error) {
        setProfile(
          profileResponse.data ?? {
            user_id: nextUser.id,
            display_name:
              (nextUser.user_metadata?.display_name as string | undefined) ?? null,
            bio: null,
            points: 0,
          },
        )
      } else {
        setProfile({
          user_id: nextUser.id,
          display_name:
            (nextUser.user_metadata?.display_name as string | undefined) ?? null,
          bio: null,
          points: 0,
        })
      }

      if (favoritesResponse && !favoritesResponse.error) {
        setFavoriteProductIds(
          new Set((favoritesResponse.data ?? []).map((row: { product_id: string }) => row.product_id)),
        )
      } else {
        // Keep the last known favorite state when a temporary request fails.
        // Clearing it here made favorites appear to randomly disappear on mobile.
        setAccountLoadError((current) =>
          current ?? "お気に入りの同期に時間がかかっています。画面を開き直すと再取得します。",
        )
      }

      if (!robotsResponse) {
        // Keep last known robots instead of flashing an empty list on a timeout.
        setRobotStorageReady(true)
        setRobotStorageError(
          "ロボット情報の取得に時間がかかっています。再度アカウント画面を開くと再取得します。",
        )
      } else if (robotsResponse.error) {
        setRobotStorageReady(!isMissingRobotStorage(robotsResponse.error))
        setRobotStorageError(robotStorageMessage(robotsResponse.error))
      } else {
        const robots = (robotsResponse.data ?? [])
          .map((row: unknown) => parseSavedRobotRow(row))
          .filter((robot: SavedRobot | null): robot is SavedRobot => Boolean(robot))
        setSavedRobots(robots)
        setRobotStorageReady(true)
        setRobotStorageError(null)
      }

      if (inventoryResponse && !inventoryResponse.error) {
        const inventory = (inventoryResponse.data ?? [])
          .map((row: unknown): GachaInventoryItem | null => {
            if (!isRecord(row)) return null
            const rewardId = row.reward_id
            const quantity = row.quantity
            if (
              typeof rewardId !== "string" ||
              !getGachaReward(rewardId) ||
              typeof quantity !== "number" ||
              !Number.isFinite(quantity)
            ) return null
            return {
              rewardId,
              quantity: Math.max(1, Math.floor(quantity)),
              firstAcquiredAt:
                typeof row.first_acquired_at === "string" ? row.first_acquired_at : undefined,
              lastAcquiredAt:
                typeof row.last_acquired_at === "string" ? row.last_acquired_at : undefined,
            }
          })
          .filter((entry: GachaInventoryItem | null): entry is GachaInventoryItem => Boolean(entry))
        setGachaInventory(inventory)
      } else {
        setAccountLoadError((current) =>
          current ?? "ガチャ獲得アイテムの同期に時間がかかっています。アカウント画面を開き直すと再取得します。",
        )
      }

      if (!customItemsResponse) {
        setCustomItemStorageReady(true)
        setCustomItemStorageError("自作アイテム情報の取得に時間がかかっています。再度アカウント画面を開くと再取得します。")
      } else if (customItemsResponse.error) {
        setCustomItemStorageReady(!isMissingCustomItemStorage(customItemsResponse.error))
        setCustomItemStorageError(customItemStorageMessage(customItemsResponse.error))
      } else {
        const items = (customItemsResponse.data ?? [])
          .map((row: unknown) => parseSavedCustomItemRow(row))
          .filter((item: SavedCustomItem | null): item is SavedCustomItem => Boolean(item))
        setSavedCustomItems(items)
        setCustomItemStorageReady(true)
        setCustomItemStorageError(null)
      }
    },
    [clearLocalAccount, getSupabase],
  )

  // Session recovery is deliberately manual. Opening/reloading the site starts
  // from the login screen instead of querying account data automatically.
  const refreshAccount = useCallback(async () => {
    setLoading(true)
    setAccountLoadError(null)
    const supabase = await getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        5000,
        "auth session",
      )
      if (error) throw error
      if (!data.session?.user) {
        setActiveLoginMarker(false)
        clearLocalAccount()
        setAccountLoadError("このタブにはログイン情報がありません。ログインしてください。")
        return
      }
      setActiveLoginMarker(true)
      await loadUserData(data.session.user)
    } catch {
      setActiveLoginMarker(false)
      clearLocalAccount()
      setAccountLoadError(
        "ログイン情報を取得できませんでした。必要な場合はもう一度ログインしてください。",
      )
    } finally {
      setLoading(false)
    }
  }, [clearLocalAccount, getSupabase, loadUserData])

  // A brand-new tab starts signed out. Once the user explicitly logs in,
  // reloads and normal <a> navigation in that same tab restore the session.
  // This keeps mobile hard-navigation usable without creating a permanent login.
  useEffect(() => {
    if (!hasActiveLoginMarker()) return
    void refreshAccount()
  }, [refreshAccount])

  const signUp = useCallback(
    async (email: string, password: string, displayName: string): Promise<AccountResult> => {
      setAccountLoadError(null)
      const supabase = await getSupabase()
      if (!supabase) return { error: "Supabaseの接続設定またはブラウザ環境を確認してください。" }

      try {
        const { data, error } = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: {
              data: { display_name: displayName.trim() },
              emailRedirectTo:
                typeof window !== "undefined"
                  ? `${window.location.origin}/?tab=account`
                  : undefined,
            },
          }),
          10000,
          "sign up",
        )

        if (error) return { error: readableAuthError(error) }
        if (data.session) {
          setActiveLoginMarker(true)
          await loadUserData(data.user)
        }

        return {
          error: null,
          needsEmailConfirmation: Boolean(data.user && !data.session),
        }
      } catch {
        return { error: "アカウント作成がタイムアウトしました。通信状態を確認してください。" }
      }
    },
    [getSupabase, loadUserData],
  )

  const signIn = useCallback(
    async (email: string, password: string): Promise<AccountResult> => {
      setAccountLoadError(null)
      const supabase = await getSupabase()
      if (!supabase) return { error: "Supabaseの接続設定またはブラウザ環境を確認してください。" }

      try {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          10000,
          "sign in",
        )
        if (error) return { error: readableAuthError(error) }

        setActiveLoginMarker(true)
        await loadUserData(data.user)
        return { error: null }
      } catch {
        return { error: "ログインがタイムアウトしました。通信状態を確認してください。" }
      }
    },
    [getSupabase, loadUserData],
  )

  const signOut = useCallback(async (): Promise<AccountResult> => {
    const supabase = await getSupabase()
    if (supabase) {
      try {
        const { error } = await withTimeout(supabase.auth.signOut(), 7000, "sign out")
        if (error) return { error: readableAuthError(error) }
      } catch {
        // Local state still gets cleared. This intentionally makes logout safe
        // even if the mobile network is unavailable at that moment.
      }
    }

    setActiveLoginMarker(false)
    clearLocalAccount()
    setAccountLoadError(null)
    return { error: null }
  }, [clearLocalAccount, getSupabase])

  const saveProfile = useCallback(
    async (displayName: string, bio: string): Promise<AccountResult> => {
      const supabase = await getSupabase()
      if (!supabase || !user) return { error: "ログインが必要です。" }

      const nextProfile = {
        user_id: user.id,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from("profiles")
        .upsert(nextProfile, { onConflict: "user_id" })
        .select("user_id, display_name, bio, points, created_at, updated_at")
        .single()

      if (error) return { error: error.message }

      setProfile(data as Profile)
      return { error: null }
    },
    [getSupabase, user],
  )

  const toggleFavorite = useCallback(
    async (productId: string): Promise<AccountResult> => {
      const supabase = await getSupabase()
      if (!supabase || !user) return { error: "お気に入りの保存にはログインが必要です。" }

      const wasFavorite = favoriteProductIds.has(productId)
      const optimistic = new Set(favoriteProductIds)
      if (wasFavorite) optimistic.delete(productId)
      else optimistic.add(productId)
      setFavoriteProductIds(optimistic)

      const response = wasFavorite
        ? await supabase
            .from("favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("product_id", productId)
        : await supabase.from("favorites").insert({
            user_id: user.id,
            product_id: productId,
          })

      if (response.error) {
        setFavoriteProductIds(new Set(favoriteProductIds))
        return { error: response.error.message }
      }

      return { error: null }
    },
    [favoriteProductIds, getSupabase, user],
  )

  const saveRobot = useCallback(
    async (config: RobotConfig, robotId?: string): Promise<RobotAccountResult> => {
      const supabase = await getSupabase()
      if (!supabase || !user) {
        return { error: "ロボットの保存にはログインが必要です。" }
      }
      if (!robotStorageReady) {
        return { error: robotStorageError ?? robotStorageMessage() }
      }

      const cleanName = sanitizeRobotName(config.name, config.base)
      const cleanConfig = normalizeRobotConfig({ ...config, name: cleanName })
      const payload = {
        user_id: user.id,
        name: cleanName,
        config: cleanConfig,
        updated_at: new Date().toISOString(),
      }

      const query = robotId
        ? supabase
            .from("saved_robots")
            .update(payload)
            .eq("id", robotId)
            .eq("user_id", user.id)
        : supabase.from("saved_robots").insert(payload)

      const { data, error } = await query
        .select("id, user_id, name, config, is_avatar, created_at, updated_at")
        .single()

      if (error) {
        if (isMissingRobotStorage(error)) {
          setRobotStorageReady(false)
          setRobotStorageError(robotStorageMessage(error))
        }
        return { error: robotStorageMessage(error) }
      }

      const robot = parseSavedRobotRow(data)
      if (!robot) return { error: "保存したロボットデータを読み取れませんでした。" }

      setSavedRobots((current) => {
        const withoutSaved = current.filter((item) => item.id !== robot.id)
        return [robot, ...withoutSaved]
      })
      return { error: null, robot }
    },
    [getSupabase, robotStorageError, robotStorageReady, user],
  )

  const deleteRobot = useCallback(
    async (robotId: string): Promise<AccountResult> => {
      const supabase = await getSupabase()
      if (!supabase || !user) return { error: "ログインが必要です。" }
      if (!robotStorageReady) return { error: robotStorageError ?? robotStorageMessage() }

      const { error } = await supabase
        .from("saved_robots")
        .delete()
        .eq("id", robotId)
        .eq("user_id", user.id)

      if (error) return { error: robotStorageMessage(error) }

      setSavedRobots((current) => current.filter((robot) => robot.id !== robotId))
      return { error: null }
    },
    [getSupabase, robotStorageError, robotStorageReady, user],
  )

  const saveCustomItem = useCallback(
    async (document: CustomItemDocument, itemId?: string): Promise<CustomItemAccountResult> => {
      const supabase = await getSupabase()
      if (!supabase || !user) return { error: "自作アイテムの保存にはログインが必要です。" }
      if (!customItemStorageReady) return { error: customItemStorageError ?? customItemStorageMessage() }

      const cleanName = sanitizeCustomItemName(document.name)
      const cleanDocument = normalizeCustomItemDocument({ ...document, name: cleanName }, cleanName)
      if (cleanDocument.parts.length === 0) return { error: "工作部品を1つ以上配置してください。" }

      const payload = {
        user_id: user.id,
        name: cleanName,
        document: cleanDocument,
        updated_at: new Date().toISOString(),
      }
      const query = itemId
        ? supabase.from("custom_items").update(payload).eq("id", itemId).eq("user_id", user.id)
        : supabase.from("custom_items").insert(payload)
      const { data, error } = await query
        .select("id, user_id, name, document, created_at, updated_at")
        .single()

      if (error) {
        if (isMissingCustomItemStorage(error)) {
          setCustomItemStorageReady(false)
          setCustomItemStorageError(customItemStorageMessage(error))
        }
        return { error: customItemStorageMessage(error) }
      }

      const item = parseSavedCustomItemRow(data)
      if (!item) return { error: "保存した自作アイテムデータを読み取れませんでした。" }
      setSavedCustomItems((current) => [item, ...current.filter((entry) => entry.id !== item.id)])
      return { error: null, item }
    },
    [customItemStorageError, customItemStorageReady, getSupabase, user],
  )

  const deleteCustomItem = useCallback(
    async (itemId: string): Promise<AccountResult> => {
      const supabase = await getSupabase()
      if (!supabase || !user) return { error: "ログインが必要です。" }
      if (!customItemStorageReady) return { error: customItemStorageError ?? customItemStorageMessage() }
      const usedByRobot = savedRobots.some((robot) => {
        const held = normalizeRobotHeldItem(robot.config.heldItem, robot.config.item)
        return held.kind === "custom" && held.customItemId === itemId
      })
      if (usedByRobot) {
        return { error: "この自作アイテムは保存済みロボットが装備しています。先にロボット側で別の持ちものへ変更してください。" }
      }
      const { error } = await supabase.from("custom_items").delete().eq("id", itemId).eq("user_id", user.id)
      if (error) return { error: customItemStorageMessage(error) }
      setSavedCustomItems((current) => current.filter((item) => item.id !== itemId))
      return { error: null }
    },
    [customItemStorageError, customItemStorageReady, getSupabase, savedRobots, user],
  )

  const setAvatarRobot = useCallback(
    async (robotId: string | null): Promise<AccountResult> => {
      const supabase = await getSupabase()
      if (!supabase || !user) return { error: "ログインが必要です。" }
      if (!robotStorageReady) return { error: robotStorageError ?? robotStorageMessage() }

      if (robotId === null) {
        const { error } = await supabase
          .from("saved_robots")
          .update({ is_avatar: false, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("is_avatar", true)

        if (error) return { error: robotStorageMessage(error) }
        setSavedRobots((current) =>
          current.map((robot) => ({ ...robot, is_avatar: false })),
        )
        return { error: null }
      }

      const { error } = await supabase.rpc("set_robot_avatar", {
        target_robot_id: robotId,
      })

      if (error) {
        if (isMissingRobotStorage(error)) {
          setRobotStorageReady(false)
          setRobotStorageError(robotStorageMessage(error))
        }
        return { error: robotStorageMessage(error) }
      }

      setSavedRobots((current) =>
        current.map((robot) => ({ ...robot, is_avatar: robot.id === robotId })),
      )
      return { error: null }
    },
    [getSupabase, robotStorageError, robotStorageReady, user],
  )

  const purchaseCart = useCallback(
    async (items: CartItem[], idempotencyKey: string): Promise<PurchaseAccountResult> => {
      const supabase = await getSupabase()
      if (!supabase || !user) {
        return { error: "購入するにはログインが必要です。" }
      }
      if (items.length === 0) {
        return { error: "カートに商品がありません。" }
      }

      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          5000,
          "purchase session",
        )
        if (error || !data.session?.access_token) {
          return { error: "ログイン情報を確認できませんでした。もう一度ログインしてください。" }
        }

        const response = await withTimeout(
          fetch("/api/purchase", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ items, idempotencyKey }),
          }),
          15000,
          "purchase",
        )
        const payload = (await response.json().catch(() => null)) as
          | ({ ok?: boolean; error?: string } & Partial<PurchaseResult>)
          | null

        if (!response.ok || !payload?.ok || !payload.orderId) {
          return { error: payload?.error || "購入処理を完了できませんでした。" }
        }

        const purchase: PurchaseResult = {
          orderId: payload.orderId,
          productTotal: Number(payload.productTotal) || 0,
          shippingTotal: Number(payload.shippingTotal) || 0,
          totalAmount: Number(payload.totalAmount) || 0,
          pointsAwarded: Number(payload.pointsAwarded) || 0,
          pointsBalance: Number(payload.pointsBalance) || 0,
          createdAt: typeof payload.createdAt === "string" ? payload.createdAt : undefined,
        }

        setProfile((current) => ({
          user_id: user.id,
          display_name:
            current?.display_name ??
            ((user.user_metadata?.display_name as string | undefined) ?? null),
          bio: current?.bio ?? null,
          points: purchase.pointsBalance,
          created_at: current?.created_at,
          updated_at: new Date().toISOString(),
        }))

        return { error: null, purchase }
      } catch {
        return { error: "購入処理がタイムアウトしました。通信状態を確認してください。" }
      }
    },
    [getSupabase, user],
  )

  const spinGacha = useCallback(
    async (rollId: string): Promise<GachaAccountResult> => {
      const supabase = await getSupabase()
      if (!supabase || !user) return { error: "ガチャを回すにはログインが必要です。" }

      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          5000,
          "gacha session",
        )
        if (error || !data.session?.access_token) {
          return { error: "ログイン情報を確認できませんでした。もう一度ログインしてください。" }
        }

        const response = await withTimeout(
          fetch("/api/gacha", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ rollId }),
          }),
          15000,
          "gacha",
        )
        const payload = (await response.json().catch(() => null)) as
          | ({ ok?: boolean; error?: string } & Partial<GachaSpinResult>)
          | null

        if (!response.ok || !payload?.ok || !payload.rollId || !payload.rewardId) {
          return { error: payload?.error || "ガチャ処理を完了できませんでした。" }
        }

        const reward = getGachaReward(payload.rewardId)
        if (!reward) return { error: "ガチャ景品の情報を読み取れませんでした。" }

        const spin: GachaSpinResult = {
          rollId: payload.rollId,
          rewardId: payload.rewardId,
          category: reward.category,
          label: typeof payload.label === "string" ? payload.label : reward.label,
          value: typeof payload.value === "string" ? payload.value : reward.value,
          rarity:
            payload.rarity === "rare" || payload.rarity === "special"
              ? payload.rarity
              : "normal",
          quantity: Math.max(1, Number(payload.quantity) || 1),
          pointsBalance: Math.max(0, Number(payload.pointsBalance) || 0),
          duplicate: Boolean(payload.duplicate),
        }

        setProfile((current) => ({
          user_id: user.id,
          display_name:
            current?.display_name ??
            ((user.user_metadata?.display_name as string | undefined) ?? null),
          bio: current?.bio ?? null,
          points: spin.pointsBalance,
          created_at: current?.created_at,
          updated_at: new Date().toISOString(),
        }))
        setGachaInventory((current) => {
          const existing = current.find((entry) => entry.rewardId === spin.rewardId)
          if (!existing) {
            return [
              {
                rewardId: spin.rewardId,
                quantity: spin.quantity,
                firstAcquiredAt: new Date().toISOString(),
                lastAcquiredAt: new Date().toISOString(),
              },
              ...current,
            ]
          }
          return current.map((entry) =>
            entry.rewardId === spin.rewardId
              ? { ...entry, quantity: spin.quantity, lastAcquiredAt: new Date().toISOString() }
              : entry,
          )
        })

        return { error: null, spin }
      } catch {
        return { error: "ガチャ処理がタイムアウトしました。通信状態を確認してください。" }
      }
    },
    [getSupabase, user],
  )

  const avatarRobot = useMemo(
    () => savedRobots.find((robot) => robot.is_avatar) ?? null,
    [savedRobots],
  )

  const value = useMemo<AccountContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      accountLoadError,
      user,
      profile,
      favoriteProductIds,
      savedRobots,
      avatarRobot,
      gachaInventory,
      savedCustomItems,
      robotStorageReady,
      robotStorageError,
      customItemStorageReady,
      customItemStorageError,
      signUp,
      signIn,
      signOut,
      saveProfile,
      toggleFavorite,
      saveRobot,
      deleteRobot,
      saveCustomItem,
      deleteCustomItem,
      setAvatarRobot,
      purchaseCart,
      spinGacha,
      refreshAccount,
    }),
    [
      accountLoadError,
      avatarRobot,
      deleteRobot,
      deleteCustomItem,
      favoriteProductIds,
      gachaInventory,
      savedCustomItems,
      customItemStorageError,
      customItemStorageReady,
      loading,
      profile,
      purchaseCart,
      spinGacha,
      refreshAccount,
      robotStorageError,
      robotStorageReady,
      saveProfile,
      saveRobot,
      saveCustomItem,
      savedRobots,
      setAvatarRobot,
      signIn,
      signOut,
      signUp,
      toggleFavorite,
      user,
    ],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) {
    throw new Error("useAccount must be used inside AccountProvider")
  }
  return context
}
