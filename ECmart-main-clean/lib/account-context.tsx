"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Session, User } from "@supabase/supabase-js"
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

export function AccountProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [savedRobots, setSavedRobots] = useState<SavedRobot[]>([])
  const [robotStorageReady, setRobotStorageReady] = useState(true)
  const [robotStorageError, setRobotStorageError] = useState<string | null>(null)

  const loadUserData = useCallback(
    async (nextUser: User | null) => {
      setUser(nextUser)

      if (!supabase || !nextUser) {
        setProfile(null)
        setFavoriteProductIds(new Set())
        setSavedRobots([])
        setRobotStorageReady(true)
        setRobotStorageError(null)
        return
      }

      const [profileResponse, favoritesResponse, robotsResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, bio, created_at, updated_at")
          .eq("user_id", nextUser.id)
          .maybeSingle(),
        supabase.from("favorites").select("product_id").eq("user_id", nextUser.id),
        supabase
          .from("saved_robots")
          .select("id, user_id, name, config, is_avatar, created_at, updated_at")
          .eq("user_id", nextUser.id)
          .order("updated_at", { ascending: false }),
      ])

      if (!profileResponse.error) {
        setProfile(
          profileResponse.data ?? {
            user_id: nextUser.id,
            display_name:
              (nextUser.user_metadata?.display_name as string | undefined) ?? null,
            bio: null,
          },
        )
      }

      if (!favoritesResponse.error) {
        setFavoriteProductIds(
          new Set((favoritesResponse.data ?? []).map((row: { product_id: string }) => row.product_id)),
        )
      }

      if (robotsResponse.error) {
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
    [supabase],
  )

  const refreshAccount = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.getUser()
    if (error) {
      setUser(null)
      setProfile(null)
      setFavoriteProductIds(new Set())
      setSavedRobots([])
      setLoading(false)
      return
    }

    await loadUserData(data.user)
    setLoading(false)
  }, [loadUserData, supabase])

  useEffect(() => {
    void refreshAccount()

    if (!supabase) return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      window.setTimeout(() => {
        void loadUserData(session?.user ?? null).finally(() => setLoading(false))
      }, 0)
    })

    return () => subscription.unsubscribe()
  }, [loadUserData, refreshAccount, supabase])

  const signUp = useCallback(
    async (email: string, password: string, displayName: string): Promise<AccountResult> => {
      if (!supabase) return { error: "Supabaseの接続設定がまだ完了していません。" }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() },
        },
      })

      if (error) return { error: readableAuthError(error) }

      if (data.session) {
        await loadUserData(data.user)
      }

      return {
        error: null,
        needsEmailConfirmation: Boolean(data.user && !data.session),
      }
    },
    [loadUserData, supabase],
  )

  const signIn = useCallback(
    async (email: string, password: string): Promise<AccountResult> => {
      if (!supabase) return { error: "Supabaseの接続設定がまだ完了していません。" }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: readableAuthError(error) }

      await loadUserData(data.user)
      return { error: null }
    },
    [loadUserData, supabase],
  )

  const signOut = useCallback(async (): Promise<AccountResult> => {
    if (!supabase) return { error: "Supabaseの接続設定がまだ完了していません。" }

    const { error } = await supabase.auth.signOut()
    if (error) return { error: readableAuthError(error) }

    setUser(null)
    setProfile(null)
    setFavoriteProductIds(new Set())
    setSavedRobots([])
    return { error: null }
  }, [supabase])

  const saveProfile = useCallback(
    async (displayName: string, bio: string): Promise<AccountResult> => {
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
    [supabase, user],
  )

  const toggleFavorite = useCallback(
    async (productId: string): Promise<AccountResult> => {
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
    [favoriteProductIds, supabase, user],
  )

  const saveRobot = useCallback(
    async (config: RobotConfig, robotId?: string): Promise<RobotAccountResult> => {
      if (!supabase || !user) {
        return { error: "ロボットの保存にはログインが必要です。" }
      }
      if (!robotStorageReady) {
        return { error: robotStorageError ?? robotStorageMessage() }
      }

      const cleanName = config.name.trim().slice(0, 40) || (config.base === "volta" ? "ボルタ" : "ナッティ")
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
    [robotStorageError, robotStorageReady, supabase, user],
  )

  const deleteRobot = useCallback(
    async (robotId: string): Promise<AccountResult> => {
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
    [robotStorageError, robotStorageReady, supabase, user],
  )

  const setAvatarRobot = useCallback(
    async (robotId: string | null): Promise<AccountResult> => {
      if (!supabase || !user) return { error: "ログインが必要です。" }
      if (!robotStorageReady) return { error: robotStorageError ?? robotStorageMessage() }

      if (robotId === null) {
        const { error } = await supabase
          .from("saved_robots")
          .update({ is_avatar: false, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("is_avatar", true)

        if (error) return { error: robotStorageMessage(error) }
        setSavedRobots((current) => current.map((robot) => ({ ...robot, is_avatar: false })))
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
    [robotStorageError, robotStorageReady, supabase, user],
  )

  const avatarRobot = useMemo(
    () => savedRobots.find((robot) => robot.is_avatar) ?? null,
    [savedRobots],
  )

  const value = useMemo<AccountContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
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
