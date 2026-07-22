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
import type { User } from "@supabase/supabase-js"
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

interface AccountContextValue {
  configured: boolean
  loading: boolean
  user: User | null
  profile: Profile | null
  favoriteProductIds: Set<string>
  signUp: (email: string, password: string, displayName: string) => Promise<AccountResult>
  signIn: (email: string, password: string) => Promise<AccountResult>
  signOut: () => Promise<AccountResult>
  saveProfile: (displayName: string, bio: string) => Promise<AccountResult>
  toggleFavorite: (productId: string) => Promise<AccountResult>
  refreshAccount: () => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

function readableAuthError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが違います。"
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

  return message
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(
    () => new Set(),
  )

  const loadUserData = useCallback(
    async (nextUser: User | null) => {
      setUser(nextUser)

      if (!supabase || !nextUser) {
        setProfile(null)
        setFavoriteProductIds(new Set())
        return
      }

      const [profileResponse, favoritesResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, bio, created_at, updated_at")
          .eq("user_id", nextUser.id)
          .maybeSingle(),
        supabase.from("favorites").select("product_id").eq("user_id", nextUser.id),
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
          new Set((favoritesResponse.data ?? []).map((row) => row.product_id as string)),
        )
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Authコールバック内で別のSupabase処理を直接待つと競合する場合があるため、
      // 次のイベントループでプロフィールとお気に入りを読み込みます。
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

      if (error) return { error: readableAuthError(error.message) }

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
      if (error) return { error: readableAuthError(error.message) }

      await loadUserData(data.user)
      return { error: null }
    },
    [loadUserData, supabase],
  )

  const signOut = useCallback(async (): Promise<AccountResult> => {
    if (!supabase) return { error: "Supabaseの接続設定がまだ完了していません。" }

    const { error } = await supabase.auth.signOut()
    if (error) return { error: readableAuthError(error.message) }

    setUser(null)
    setProfile(null)
    setFavoriteProductIds(new Set())
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

  const value = useMemo<AccountContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      user,
      profile,
      favoriteProductIds,
      signUp,
      signIn,
      signOut,
      saveProfile,
      toggleFavorite,
      refreshAccount,
    }),
    [
      favoriteProductIds,
      loading,
      profile,
      refreshAccount,
      saveProfile,
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
