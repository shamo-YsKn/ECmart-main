"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import type { CartApi } from "@/lib/use-cart"
import { products } from "@/lib/data"
import { useAccount } from "@/lib/account-context"
import { ProductCard } from "@/components/product-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  Heart,
  LoaderCircle,
  LogIn,
  LogOut,
  Save,
  Settings2,
  UserPlus,
  UserRound,
} from "lucide-react"
import { cn } from "@/lib/utils"

type AuthMode = "signIn" | "signUp"

type Notice = {
  type: "success" | "error"
  text: string
} | null

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        notice.type === "success"
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-red-300 bg-red-50 text-red-800",
      )}
      role="status"
    >
      {notice.text}
    </div>
  )
}

export function AccountView({ cart }: { cart: CartApi }) {
  const account = useAccount()
  const [mode, setMode] = useState<AuthMode>("signIn")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  useEffect(() => {
    setDisplayName(account.profile?.display_name ?? "")
    setBio(account.profile?.bio ?? "")
  }, [account.profile])

  const favoriteProducts = useMemo(
    () => products.filter((product) => account.favoriteProductIds.has(product.id)),
    [account.favoriteProductIds],
  )

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)

    if (!email.trim() || !password) {
      setNotice({ type: "error", text: "メールアドレスとパスワードを入力してください。" })
      return
    }

    if (mode === "signUp") {
      if (!displayName.trim()) {
        setNotice({ type: "error", text: "表示名を入力してください。" })
        return
      }
      if (password !== passwordConfirm) {
        setNotice({ type: "error", text: "確認用パスワードが一致しません。" })
        return
      }
    }

    setSubmitting(true)
    const result =
      mode === "signUp"
        ? await account.signUp(email.trim(), password, displayName)
        : await account.signIn(email.trim(), password)
    setSubmitting(false)

    if (result.error) {
      setNotice({ type: "error", text: result.error })
      return
    }

    if (result.needsEmailConfirmation) {
      setNotice({
        type: "success",
        text: "確認メールを送信しました。メール内のリンクを開いたあと、ログインしてください。",
      })
      setMode("signIn")
      setPassword("")
      setPasswordConfirm("")
      return
    }

    setNotice({ type: "success", text: mode === "signUp" ? "アカウントを作成しました。" : "ログインしました。" })
    setPassword("")
    setPasswordConfirm("")
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setNotice(null)
    const result = await account.saveProfile(displayName, bio)
    setSubmitting(false)
    setNotice(
      result.error
        ? { type: "error", text: result.error }
        : { type: "success", text: "プロフィールを保存しました。" },
    )
  }

  async function handleSignOut() {
    setSubmitting(true)
    setNotice(null)
    const result = await account.signOut()
    setSubmitting(false)
    setNotice(
      result.error
        ? { type: "error", text: result.error }
        : { type: "success", text: "ログアウトしました。" },
    )
  }

  if (!account.configured) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display flex items-center gap-2 text-3xl font-black">
            <UserRound className="size-7 text-primary" />
            アカウント
          </h1>
          <p className="text-muted-foreground">プロフィールやお気に入りを保存できます。</p>
        </div>

        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Settings2 className="size-5 text-primary" />
              Supabaseの初期設定が必要です
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              コードへの組み込みは完了しています。Supabaseで無料プロジェクトを作成し、
              プロジェクトURLとPublishable keyを設定すると、登録・ログイン・プロフィール・お気に入りが動きます。
            </p>
            <div className="rounded-xl bg-muted p-4 font-mono text-xs text-foreground">
              <div>NEXT_PUBLIC_SUPABASE_URL=...</div>
              <div>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...</div>
            </div>
            <p>
              詳しい手順はプロジェクト内の <code className="rounded bg-muted px-1">SUPABASE_SETUP.md</code> を確認してください。
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (account.loading) {
    return (
      <div className="flex min-h-72 items-center justify-center gap-2 text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" />
        アカウント情報を読み込んでいます…
      </div>
    )
  }

  if (!account.user) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="size-7" />
          </div>
          <h1 className="font-display text-3xl font-black">マイアカウント</h1>
          <p className="mt-2 text-muted-foreground">
            ログインすると、お気に入りを端末をまたいで保存できます。
          </p>
        </div>

        <Card className="border-2">
          <CardHeader>
            <div className="grid grid-cols-2 rounded-full bg-muted p-1">
              <button
                type="button"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-bold transition-colors",
                  mode === "signIn" && "bg-background shadow-sm",
                )}
                onClick={() => {
                  setMode("signIn")
                  setNotice(null)
                }}
              >
                ログイン
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-bold transition-colors",
                  mode === "signUp" && "bg-background shadow-sm",
                )}
                onClick={() => {
                  setMode("signUp")
                  setNotice(null)
                }}
              >
                新規登録
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleAuth}>
              {mode === "signUp" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-name">表示名</Label>
                  <Input
                    id="signup-name"
                    value={displayName}
                    maxLength={40}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="れい：ボルタ好き"
                    autoComplete="nickname"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="account-email">メールアドレス</Label>
                <Input
                  id="account-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="account-password">パスワード</Label>
                <Input
                  id="account-password"
                  type="password"
                  value={password}
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="6文字以上"
                  autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                />
              </div>

              {mode === "signUp" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="account-password-confirm">パスワード（確認）</Label>
                  <Input
                    id="account-password-confirm"
                    type="password"
                    value={passwordConfirm}
                    minLength={6}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              )}

              <NoticeBox notice={notice} />

              <Button type="submit" className="rounded-full" disabled={submitting}>
                {submitting ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : mode === "signIn" ? (
                  <LogIn data-icon="inline-start" />
                ) : (
                  <UserPlus data-icon="inline-start" />
                )}
                {mode === "signIn" ? "ログイン" : "アカウントを作成"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-black">マイページ</h1>
            <Badge variant="secondary" className="rounded-full">ログイン中</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            {account.profile?.display_name || account.user.email || "マチノワ会員"}さん、こんにちは。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={handleSignOut}
          disabled={submitting}
        >
          <LogOut data-icon="inline-start" />
          ログアウト
        </Button>
      </div>

      <NoticeBox notice={notice} />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <UserRound className="size-5 text-primary" />
              プロフィール
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-5" onSubmit={handleSaveProfile}>
              <div className="flex flex-col gap-2">
                <Label>登録メールアドレス</Label>
                <div className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {account.user.email}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-name">表示名</Label>
                <Input
                  id="profile-name"
                  value={displayName}
                  maxLength={40}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="表示名"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-bio">ひとこと</Label>
                <textarea
                  id="profile-bio"
                  value={bio}
                  maxLength={240}
                  rows={5}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="好きなものや町とのつながりを書いてみましょう。"
                  className="min-h-24 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <span className="text-right text-xs text-muted-foreground">{bio.length}/240</span>
              </div>
              <Button type="submit" className="rounded-full" disabled={submitting}>
                {submitting ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                プロフィールを保存
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-2 bg-primary/5">
          <CardContent className="flex h-full flex-col justify-center gap-4 p-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-black">保存機能が有効です</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                お気に入りはSupabaseに保存されるため、同じアカウントでログインすれば、別のパソコンやスマートフォンからも確認できます。
              </p>
            </div>
            <div className="rounded-xl border bg-background/80 p-4 text-sm">
              <div className="text-muted-foreground">お気に入り登録数</div>
              <div className="font-display mt-1 text-3xl font-black text-primary">
                {favoriteProducts.length}
                <span className="ml-1 text-sm text-foreground">点</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-5">
        <div>
          <h2 className="font-display flex items-center gap-2 text-2xl font-black">
            <Heart className="size-6 fill-current text-rose-500" />
            お気に入り
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            商品カードのハートを押すと、ここに保存されます。
          </p>
        </div>

        {favoriteProducts.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteProducts.map((product) => (
              <ProductCard key={product.id} product={product} cart={cart} />
            ))}
          </div>
        ) : (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
              <Heart className="size-9" />
              <div>
                <p className="font-display font-bold text-foreground">まだお気に入りはありません</p>
                <p className="mt-1 text-sm">気になる商品のハートを押してみてください。</p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
