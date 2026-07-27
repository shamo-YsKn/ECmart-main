"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import type {
  RobotBase,
  RobotConfig,
  RobotItem,
  RobotPose,
  RobotView,
  SavedRobot,
} from "@/lib/types"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

export interface Profile {
  user_id: string
  display_name: string | null
  bio: string | null
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

interface AccountContextValue {
  configured: boolean
  loading: boolean
  accountLoadError: string | null
  user: User | null
  profile: Profile | null
  favoriteProductIds: Set<string>
  savedRobots: SavedRobot[]
  avatarRobot: SavedRobot | null
  robotStorageReady: boolean
  robotStorageError: string | null
  signUp: (email: string, password: string, displayName: string) => Promise<AccountResult>
  signIn: (email: string, password: string) => Promise<AccountResult>
  signOut: () => Promise<AccountResult>
  saveProfile: (displayName: string, bio: string) => Promise<AccountResult>
  toggleFavorite: (productId: string) => Promise<AccountResult>
  saveRobot: (config: RobotConfig, robotId?: string) => Promise<RobotAccountResult>
  deleteRobot: (robotId: string) => Promise<AccountResult>
  setAvatarRobot: (robotId: string | null) => Promise<AccountResult>
  refreshAccount: () => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

const ROBOT_BASES = new Set<RobotBase>(["volta", "natty"])
const ROBOT_VIEWS = new Set<RobotView>(["front", "side", "back"])
const ROBOT_POSES = new Set<RobotPose>(["wave", "stand", "cheer", "point"])
const ROBOT_ITEMS = new Set<RobotItem>(["none", "wrench", "flower", "gear", "heart"])

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseRobotConfig(value: unknown, fallbackName: string): RobotConfig | null {
  if (!isRecord(value)) return null

  const base = value.base
  const view = value.view
  const pose = value.pose
  const item = value.item
  const size = value.size
  const bodyColor = value.bodyColor
  const accentColor = value.accentColor
  const name = value.name

  if (
    typeof base !== "string" ||
    !ROBOT_BASES.has(base as RobotBase) ||
    typeof view !== "string" ||
    !ROBOT_VIEWS.has(view as RobotView) ||
    typeof pose !== "string" ||
    !ROBOT_POSES.has(pose as RobotPose) ||
    typeof item !== "string" ||
    !ROBOT_ITEMS.has(item as RobotItem) ||
    typeof size !== "number" ||
    !Number.isFinite(size) ||
    typeof bodyColor !== "string" ||
    typeof accentColor !== "string"
  ) {
    return null
  }

  return {
    base: base as RobotBase,
    view: view as RobotView,
    pose: pose as RobotPose,
    item: item as RobotItem,
    size: Math.min(90, Math.max(20, size)),
    bodyColor,
    accentColor,
    name: typeof name === "string" && name.trim() ? name.slice(0, 40) : fallbackName,
  }
}

function parseSavedRobot(row: unknown): SavedRobot | null {
  if (!isRecord(row)) return null

  const id = row.id
  const userId = row.user_id
  const name = row.name
  const createdAt = row.created_at
  const updatedAt = row.updated_at
  const isAvatar = row.is_avatar

  if (
    typeof id !== "string" ||
    typeof userId !== "string" ||
    typeof name !== "string" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string" ||
    typeof isAvatar !== "boolean"
  ) {
    return null
  }

  const config = parseRobotConfig(row.config, name)
  if (!config) return null

  return {
    id,
    user_id: userId,
    name,
    config,
    is_avatar: isAvatar,
    created_at: createdAt,
    updated_at: updatedAt,
  }
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
  const [robotStorageReady, setRobotStorageReady] = useState(true)
  const [robotStorageError, setRobotStorageError] = useState<string | null>(null)

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
    setRobotStorageReady(true)
    setRobotStorageError(null)
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

      const [profileResult, favoritesResult, robotsResult] = await Promise.allSettled([
        withTimeout(
          supabase
            .from("profiles")
            .select("user_id, display_name, bio, created_at, updated_at")
            .eq("user_id", nextUser.id)
            .maybeSingle(),
          7000,
          "profile",
        ),
        withTimeout(
          supabase.from("favorites").select("product_id").eq("user_id", nextUser.id),
          7000,
          "favorites",
        ),
        withTimeout(
          supabase
            .from("saved_robots")
            .select("id, user_id, name, config, is_avatar, created_at, updated_at")
            .eq("user_id", nextUser.id)
            .order("updated_at", { ascending: false }),
          7000,
          "robots",
        ),
      ])

      const profileResponse = profileResult.status === "fulfilled" ? profileResult.value : null
      const favoritesResponse = favoritesResult.status === "fulfilled" ? favoritesResult.value : null
      const robotsResponse = robotsResult.status === "fulfilled" ? robotsResult.value : null

      if (profileResponse && !profileResponse.error) {
        setProfile(
          profileResponse.data ?? {
            user_id: nextUser.id,
            display_name:
              (nextUser.user_metadata?.display_name as string | undefined) ?? null,
            bio: null,
          },
        )
      } else {
        setProfile({
          user_id: nextUser.id,
          display_name:
            (nextUser.user_metadata?.display_name as string | undefined) ?? null,
          bio: null,
        })
      }

      if (favoritesResponse && !favoritesResponse.error) {
        setFavoriteProductIds(
          new Set((favoritesResponse.data ?? []).map((row: { product_id: string }) => row.product_id)),
        )
      } else {
        setFavoriteProductIds(new Set())
      }

      if (!robotsResponse) {
        setSavedRobots([])
        setRobotStorageReady(true)
        setRobotStorageError(
          "ロボット情報の取得がタイムアウトしました。通信状態を確認してください。",
        )
      } else if (robotsResponse.error) {
        setSavedRobots([])
        setRobotStorageReady(!isMissingRobotStorage(robotsResponse.error))
        setRobotStorageError(robotStorageMessage(robotsResponse.error))
      } else {
        const robots = (robotsResponse.data ?? [])
          .map((row: unknown) => parseSavedRobot(row))
          .filter((robot: SavedRobot | null): robot is SavedRobot => Boolean(robot))
        setSavedRobots(robots)
        setRobotStorageReady(true)
        setRobotStorageError(null)
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
        clearLocalAccount()
        setAccountLoadError("このタブにはログイン情報がありません。ログインしてください。")
        return
      }
      await loadUserData(data.session.user)
    } catch {
      clearLocalAccount()
      setAccountLoadError(
        "ログイン情報を取得できませんでした。必要な場合はもう一度ログインしてください。",
      )
    } finally {
      setLoading(false)
    }
  }, [clearLocalAccount, getSupabase, loadUserData])

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
        if (data.session) await loadUserData(data.user)

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
        .select("user_id, display_name, bio, created_at, updated_at")
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

      const cleanName =
        config.name.trim().slice(0, 40) ||
        (config.base === "volta" ? "ボルタ" : "ナッティ")
      const cleanConfig: RobotConfig = {
        ...config,
        name: cleanName,
        size: Math.min(90, Math.max(20, config.size)),
      }
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

      const robot = parseSavedRobot(data)
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
      robotStorageReady,
      robotStorageError,
      signUp,
      signIn,
      signOut,
      saveProfile,
      toggleFavorite,
      saveRobot,
      deleteRobot,
      setAvatarRobot,
      refreshAccount,
    }),
    [
      accountLoadError,
      avatarRobot,
      deleteRobot,
      favoriteProductIds,
      loading,
      profile,
      refreshAccount,
      robotStorageError,
      robotStorageReady,
      saveProfile,
      saveRobot,
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
