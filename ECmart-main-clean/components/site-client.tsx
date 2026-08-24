"use client"

import { useCallback, useEffect, useState, type MouseEvent } from "react"
import { useCart } from "@/lib/use-cart"
import { AccountProvider, useAccount } from "@/lib/account-context"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { HomeView } from "@/components/views/home-view"
import { ShopsView } from "@/components/views/shops-view"
import { RankingView } from "@/components/views/ranking-view"
import { CartView } from "@/components/views/cart-view"
import { AccountView } from "@/components/views/account-view"
import { GachaView } from "@/components/views/gacha-view"
import { RobotWorkshop } from "@/components/robot/robot-workshop"
import { CustomItemWorkshop } from "@/components/workbench/custom-item-workshop"
import { RobotAvatar } from "@/components/robot/robot-avatar"
import { normalizeRobotHeldItem } from "@/lib/robot-held-item"
import {
  Hammer,
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

type NavigationTabKey = (typeof TABS)[number]["key"]
type TabKey = NavigationTabKey | "gacha" | "workbench"
const VALID_PAGE_TABS = new Set<TabKey>([...TABS.map((item) => item.key), "gacha", "workbench"])

function hrefForTab(tab: TabKey) {
  return tab === "home" ? "?tab=home" : `?tab=${tab}`
}

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

function Site({ initialTab, initialAuthMode }: { initialTab: TabKey; initialAuthMode: "signIn" | "signUp" }) {
  const cart = useCart()
  const account = useAccount()
  const [tab, setTab] = useState<TabKey>(initialTab)

  const navigate = useCallback((next: string, pushHistory = true) => {
    if (!VALID_PAGE_TABS.has(next as TabKey)) return
    const nextTab = next as TabKey
    setTab(nextTab)

    if (typeof window !== "undefined") {
      if (pushHistory) {
        const url = new URL(window.location.href)
        url.searchParams.set("tab", nextTab)
        window.history.pushState({ tab: nextTab }, "", url)
      }
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [])

  const handleNavLink = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, next: NavigationTabKey) => {
      // Keep normal browser behavior for opening in another tab/window.
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }
      event.preventDefault()
      navigate(next)
    },
    [navigate],
  )

  useEffect(() => {
    function handleNavigate(event: Event) {
      const customEvent = event as CustomEvent<{ tab?: string }>
      if (customEvent.detail?.tab) navigate(customEvent.detail.tab)
    }

    function handlePopState() {
      const next = new URL(window.location.href).searchParams.get("tab") || "home"
      navigate(next, false)
    }

    window.addEventListener("machinowa:navigate", handleNavigate)
    window.addEventListener("popstate", handlePopState)
    return () => {
      window.removeEventListener("machinowa:navigate", handleNavigate)
      window.removeEventListener("popstate", handlePopState)
    }
  }, [navigate])

  const accountLabel = account.user
    ? account.profile?.display_name || "マイページ"
    : "ログイン"

  function avatarCustomItemDocument() {
    if (!account.avatarRobot) return null
    const held = normalizeRobotHeldItem(account.avatarRobot.config.heldItem, account.avatarRobot.config.item)
    return held.kind === "custom"
      ? account.savedCustomItems.find((item) => item.id === held.customItemId)?.document ?? null
      : null
  }


  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <a
            href={hrefForTab("home")}
            className="flex items-center gap-2"
            onClick={(event) => handleNavLink(event, "home")}
            aria-label="ホームへ"
          >
            <BoltMark />
            <span className="font-display text-xl font-black tracking-tight">
              マチノワ室蘭
            </span>
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            {TABS.filter((item) => !["cart", "account"].includes(item.key)).map(
              (item) => (
                <a
                  key={item.key}
                  href={hrefForTab(item.key)}
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "rounded-full",
                    tab === item.key && "bg-muted text-foreground",
                  )}
                  onClick={(event) => handleNavLink(event, item.key)}
                >
                  {item.label}
                </a>
              ),
            )}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={hrefForTab("account")}
              className={cn(
                buttonVariants({ variant: tab === "account" ? "default" : "outline" }),
                "relative rounded-full",
              )}
              onClick={(event) => handleNavLink(event, "account")}
            >
              {account.user ? (
                <RobotAvatar
                  config={account.avatarRobot?.config}
                  customItemDocument={avatarCustomItemDocument()}
                  className="-ml-1 mr-1 size-7 border-0"
                  title="マイアカウント"
                />
              ) : (
                <UserRound data-icon="inline-start" />
              )}
              <span className="hidden max-w-28 truncate lg:inline">{accountLabel}</span>
              {account.favoriteProductIds.size > 0 && (
                <Badge className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full p-0 tabular-nums">
                  {account.favoriteProductIds.size}
                </Badge>
              )}
            </a>

            <a
              href={hrefForTab("cart")}
              className={cn(
                buttonVariants({ variant: tab === "cart" ? "default" : "outline" }),
                "relative rounded-full",
              )}
              onClick={(event) => handleNavLink(event, "cart")}
            >
              <ShoppingBag data-icon="inline-start" />
              <span className="hidden sm:inline">カート</span>
              {cart.totalCount > 0 && (
                <Badge className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full p-0 tabular-nums">
                  {cart.totalCount}
                </Badge>
              )}
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-8 md:pb-16">
        {tab === "home" && <HomeView cart={cart} onNavigate={navigate} />}
        {tab === "shops" && <ShopsView cart={cart} />}
        {tab === "ranking" && <RankingView cart={cart} />}
        {tab === "robot" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-3xl font-black">ロボット工房</h1>
                <p className="text-muted-foreground">
                  てつ工房ボルタ監修。ボルタ＆ナッティ風の、あなただけの鉄の仲間をデザインしよう。
                </p>
              </div>
              <button type="button" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")} onClick={() => navigate("workbench")}>
                <Hammer data-icon="inline-start" />
                アイテム工作へ
              </button>
            </div>
            <RobotWorkshop />
          </div>
        )}
        {tab === "workbench" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-bold text-primary">Phase 2</div>
                <h1 className="font-display mt-1 text-3xl font-black">2Dアイテム工作</h1>
                <p className="mt-2 text-muted-foreground">ネジ・ナット・LEDをつなげて工作し、完成品をボルタ・ナッティに持たせよう。</p>
              </div>
              <button type="button" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")} onClick={() => navigate("robot")}>ロボット工房へ戻る</button>
            </div>
            <CustomItemWorkshop />
          </div>
        )}
        {tab === "gacha" && <GachaView onNavigate={navigate} />}
        {tab === "account" && <AccountView cart={cart} initialMode={initialAuthMode} />}
        {tab === "cart" && <CartView cart={cart} onNavigate={navigate} />}
      </main>

      <footer className="hidden border-t md:block">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BoltMark />
            <span className="font-display text-base font-bold text-foreground">マチノワ室蘭</span>
          </div>
          <p>室蘭の名物と鉄の手仕事を集めた体験型マーケット。※商品・価格を含むデモサイトです。</p>
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-6">
          {TABS.map((item) => {
            const active = tab === item.key
            return (
              <a
                key={item.key}
                href={hrefForTab(item.key)}
                onClick={(event) => handleNavLink(event, item.key)}
                className={cn(
                  "relative flex min-w-0 flex-col items-center gap-1 py-2.5 text-[0.58rem] transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {item.key === "account" && account.user ? (
                  <RobotAvatar
                    config={account.avatarRobot?.config}
                    customItemDocument={avatarCustomItemDocument()}
                    className="size-6 border-0"
                    title="マイアカウント"
                  />
                ) : (
                  <item.icon className="size-5" />
                )}
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
              </a>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export function SiteClient({
  initialTab,
  initialAuthMode,
}: {
  initialTab: TabKey
  initialAuthMode: "signIn" | "signUp"
}) {
  return (
    <AccountProvider>
      <Site initialTab={initialTab} initialAuthMode={initialAuthMode} />
    </AccountProvider>
  )
}
