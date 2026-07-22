"use client"

import { useEffect, useState } from "react"
import { useCart } from "@/lib/use-cart"
import { AccountProvider, useAccount } from "@/lib/account-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { HomeView } from "@/components/views/home-view"
import { ShopsView } from "@/components/views/shops-view"
import { RankingView } from "@/components/views/ranking-view"
import { CartView } from "@/components/views/cart-view"
import { AccountView } from "@/components/views/account-view"
import { RobotWorkshop } from "@/components/robot/robot-workshop"
import {
  Hammer,
  Heart,
  Home,
  ShoppingBag,
  Store,
  TrendingUp,
  UserRound,
} from "lucide-react"

const TABS = [
  { key: "home", label: "ホーム", icon: Home },
  { key: "shops", label: "ショップ一覧", icon: Store },
  { key: "ranking", label: "ランキング", icon: TrendingUp },
  { key: "robot", label: "ロボット工房", icon: Hammer },
  { key: "account", label: "アカウント", icon: UserRound },
  { key: "cart", label: "カート", icon: ShoppingBag },
] as const

type TabKey = (typeof TABS)[number]["key"]

function BoltMark() {
  return (
    <svg viewBox="0 0 40 40" className="size-9" aria-hidden="true">
      <polygon
        points="20,3 34,11 34,29 20,37 6,29 6,11"
        fill="var(--color-primary)"
      />
      <circle cx="20" cy="20" r="7" fill="var(--color-background)" />
      <circle cx="20" cy="20" r="3" fill="var(--color-primary)" />
    </svg>
  )
}

function Site() {
  const cart = useCart()
  const account = useAccount()
  const [tab, setTab] = useState<TabKey>("home")

  function navigate(next: string) {
    if (!TABS.some((item) => item.key === next)) return
    setTab(next as TabKey)
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  useEffect(() => {
    function handleNavigate(event: Event) {
      const customEvent = event as CustomEvent<{ tab?: string }>
      if (customEvent.detail?.tab) navigate(customEvent.detail.tab)
    }

    window.addEventListener("machinowa:navigate", handleNavigate)
    return () => window.removeEventListener("machinowa:navigate", handleNavigate)
  }, [])

  const accountLabel = account.user
    ? account.profile?.display_name || "マイページ"
    : "ログイン"

  return (
    <div className="flex min-h-svh flex-col">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <button
            className="flex items-center gap-2"
            onClick={() => navigate("home")}
            aria-label="ホームへ"
          >
            <BoltMark />
            <span className="font-display text-xl font-black tracking-tight">
              マチノワ
            </span>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {TABS.filter((item) => !["cart", "account"].includes(item.key)).map(
              (item) => (
                <Button
                  key={item.key}
                  variant="ghost"
                  className={cn(
                    "rounded-full",
                    tab === item.key && "bg-muted text-foreground",
                  )}
                  onClick={() => navigate(item.key)}
                >
                  {item.label}
                </Button>
              ),
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant={tab === "account" ? "default" : "outline"}
              className="relative rounded-full"
              onClick={() => navigate("account")}
            >
              <UserRound data-icon="inline-start" />
              <span className="hidden lg:inline max-w-28 truncate">{accountLabel}</span>
              {account.favoriteProductIds.size > 0 && (
                <Badge className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full p-0 tabular-nums">
                  {account.favoriteProductIds.size}
                </Badge>
              )}
            </Button>

            <Button
              variant={tab === "cart" ? "default" : "outline"}
              className="relative rounded-full"
              onClick={() => navigate("cart")}
            >
              <ShoppingBag data-icon="inline-start" />
              <span className="hidden sm:inline">カート</span>
              {cart.totalCount > 0 && (
                <Badge className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full p-0 tabular-nums">
                  {cart.totalCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* メイン */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-8 md:pb-16">
        {tab === "home" && <HomeView cart={cart} onNavigate={navigate} />}
        {tab === "shops" && <ShopsView cart={cart} />}
        {tab === "ranking" && <RankingView cart={cart} />}
        {tab === "robot" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-3xl font-black">ロボット工房</h1>
              <p className="text-muted-foreground">
                てつ工房ボルタ監修。ボルタ＆ナッティ風の、あなただけの鉄の仲間をデザインしよう。
              </p>
            </div>
            <RobotWorkshop />
          </div>
        )}
        {tab === "account" && <AccountView cart={cart} />}
        {tab === "cart" && <CartView cart={cart} onNavigate={navigate} />}
      </main>

      {/* フッター */}
      <footer className="hidden border-t md:block">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BoltMark />
            <span className="font-display text-base font-bold text-foreground">マチノワ</span>
          </div>
          <p>町とつながる体験型マーケット。※これはデモサイトです。</p>
        </div>
      </footer>

      {/* モバイル下部ナビ */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-6">
          {TABS.map((item) => {
            const active = tab === item.key
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                className={cn(
                  "relative flex min-w-0 flex-col items-center gap-1 py-2.5 text-[0.58rem] transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" />
                {item.key === "cart" && cart.totalCount > 0 && (
                  <span className="absolute right-[calc(50%-1.35rem)] top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[0.6rem] font-bold text-primary-foreground">
                    {cart.totalCount}
                  </span>
                )}
                {item.key === "account" && account.favoriteProductIds.size > 0 && (
                  <span className="absolute right-[calc(50%-1.35rem)] top-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[0.6rem] font-bold text-white">
                    {account.favoriteProductIds.size}
                  </span>
                )}
                <span className="max-w-full truncate leading-none">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default function Page() {
  return (
    <AccountProvider>
      <Site />
    </AccountProvider>
  )
}
