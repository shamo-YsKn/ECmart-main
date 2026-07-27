"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import type { CartApi } from "@/lib/use-cart"
import type { SavedRobot } from "@/lib/types"
import { products } from "@/lib/data"
import { useAccount } from "@/lib/account-context"
import { ProductCard } from "@/components/product-card"
import { RobotAvatar } from "@/components/robot/robot-avatar"
import { RobotCharacter } from "@/components/robot/robot-character"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Bot,
  Check,
  CheckCircle2,
  Database,
  Heart,
  LoaderCircle,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Save,
  Settings2,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react"
import { cn } from "@/lib/utils"

type AuthMode = "signIn" | "signUp"

type Notice = {
  type: "success" | "error"
  text: string
} | null

const ROBOT_DRAFT_KEY = "machinowa:robot-draft"

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

function navigateTo(tab: "robot" | "shops") {
  window.dispatchEvent(new CustomEvent("machinowa:navigate", { detail: { tab } }))
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
  const [robotActionId, setRobotActionId] = useState<string | null>(null)
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

    setNotice({
      type: "success",
      text: mode === "signUp" ? "アカウントを作成しました。" : "ログインしました。",
    })
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

  function openWorkshop(robot?: SavedRobot) {
    if (robot) {
      window.sessionStorage.setItem(
        ROBOT_DRAFT_KEY,
        JSON.stringify({ id: robot.id, config: robot.config }),
      )
    } else {
      window.sessionStorage.removeItem(ROBOT_DRAFT_KEY)
    }
    navigateTo("robot")
  }

  async function setAvatar(robotId: string | null) {
    setRobotActionId(robotId ?? "clear")
    setNotice(null)
    const result = await account.setAvatarRobot(robotId)
    setRobotActionId(null)
    setNotice(
      result.error
        ? { type: "error", text: result.error }
        : {
            type: "success",
            text: robotId ? "アカウントアイコンを変更しました。" : "標準アイコンに戻しました。",
          },
    )
  }

  async function deleteRobot(robot: SavedRobot) {
    if (!window.confirm(`${robot.name}を削除しますか？`)) return

    setRobotActionId(robot.id)
    setNotice(null)
    const result = await account.deleteRobot(robot.id)
    setRobotActionId(null)
    setNotice(
      result.error
        ? { type: "error", text: result.error }
        : { type: "success", text: `${robot.name}を削除しました。` },
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
            ログインすると、お気に入りや自作ロボットを端末をまたいで保存できます。
          </p>
        </div>

        {account.accountLoadError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p>{account.accountLoadError}</p>
            <Button className="mt-3 rounded-full" variant="outline" onClick={() => void account.refreshAccount()}>
              もう一度取得
            </Button>
          </div>
        )}

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <RobotAvatar config={account.avatarRobot?.config} className="size-20 shadow-sm" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-black">マイページ</h1>
              <Badge variant="secondary" className="rounded-full">ログイン中</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {account.profile?.display_name || account.user.email || "マチノワ会員"}さん、こんにちは。
            </p>
          </div>
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

      {!account.robotStorageReady && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <Database className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-bold">自作ロボット保存用の追加設定が必要です</p>
              <p className="mt-1">
                SupabaseのSQL Editorで <code>supabase/robot-storage-migration.sql</code> を実行してください。
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <UserRound className="size-5 text-primary" />
              プロフィール
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-5" onSubmit={handleSaveProfile}>
              <div className="flex items-center gap-4 rounded-2xl border bg-muted/40 p-4">
                <RobotAvatar config={account.avatarRobot?.config} className="size-24" />
                <div className="min-w-0 flex-1">
                  <p className="font-display font-black">
                    {account.avatarRobot?.name ?? "標準アイコン"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    自作したボルタ／ナッティを、レビューなどで使うアカウントアイコンにできます。
                  </p>
                  {account.avatarRobot && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-3 rounded-full"
                      onClick={() => void setAvatar(null)}
                      disabled={robotActionId === "clear"}
                    >
                      {robotActionId === "clear" && <LoaderCircle className="animate-spin" />}
                      標準アイコンに戻す
                    </Button>
                  )}
                </div>
              </div>

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
          <CardContent className="flex h-full flex-col justify-center gap-5 p-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-black">アカウント保存が有効です</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                お気に入りと自作ロボットはSupabaseに保存されるため、同じアカウントなら別の端末からも確認できます。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-background/80 p-4 text-sm">
                <div className="text-muted-foreground">お気に入り</div>
                <div className="font-display mt-1 text-3xl font-black text-primary">
                  {favoriteProducts.length}<span className="ml-1 text-sm text-foreground">点</span>
                </div>
              </div>
              <div className="rounded-xl border bg-background/80 p-4 text-sm">
                <div className="text-muted-foreground">保存ロボット</div>
                <div className="font-display mt-1 text-3xl font-black text-primary">
                  {account.savedRobots.length}<span className="ml-1 text-sm text-foreground">体</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display flex items-center gap-2 text-2xl font-black">
              <Bot className="size-6 text-primary" />
              保存したボルタ・ナッティ
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              工房で作ったデザインを保存し、好きな1体をアカウントアイコンに設定できます。
            </p>
          </div>
          <Button className="rounded-full" onClick={() => openWorkshop()}>
            <Plus data-icon="inline-start" />
            新しく作る
          </Button>
        </div>

        {account.robotStorageReady && account.savedRobots.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {account.savedRobots.map((robot) => (
              <Card
                key={robot.id}
                className={cn("overflow-hidden border-2", robot.is_avatar && "border-primary")}
              >
                <div className="relative aspect-[4/3] bg-[radial-gradient(circle_at_50%_35%,var(--color-secondary),var(--color-muted))] p-3">
                  <RobotCharacter config={{ ...robot.config, view: "front" }} className="h-full w-full" />
                  {robot.is_avatar && (
                    <Badge className="absolute left-3 top-3 rounded-full">
                      <Check className="size-3" />
                      現在のアイコン
                    </Badge>
                  )}
                </div>
                <CardContent className="flex flex-col gap-4 p-4">
                  <div>
                    <h3 className="font-display text-lg font-black">{robot.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {robot.config.base === "volta" ? "ボルタ型" : "ナッティ型"}・{robot.config.size} cm
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!robot.is_avatar && (
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() => void setAvatar(robot.id)}
                        disabled={robotActionId === robot.id}
                      >
                        {robotActionId === robot.id ? (
                          <LoaderCircle className="animate-spin" data-icon="inline-start" />
                        ) : (
                          <UserRound data-icon="inline-start" />
                        )}
                        アイコンにする
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => openWorkshop(robot)}
                    >
                      <Pencil data-icon="inline-start" />
                      工房で編集
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full text-destructive hover:text-destructive"
                      onClick={() => void deleteRobot(robot)}
                      disabled={robotActionId === robot.id}
                    >
                      <Trash2 data-icon="inline-start" />
                      削除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : account.robotStorageReady ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
              <Bot className="size-9" />
              <div>
                <p className="font-display font-bold text-foreground">まだ保存したロボットはいません</p>
                <p className="mt-1 text-sm">ロボット工房で作って、アカウントへ保存してみてください。</p>
              </div>
              <Button className="mt-2 rounded-full" onClick={() => openWorkshop()}>
                ロボット工房を開く
              </Button>
            </CardContent>
          </Card>
        ) : null}
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
