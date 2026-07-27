import { SiteClient } from "@/components/site-client"

const VALID_TABS = new Set(["home", "shops", "ranking", "robot", "account", "cart"])

type TabKey = "home" | "shops" | "ranking" | "robot" | "account" | "cart"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[]; auth?: string | string[] }>
}) {
  const params = await searchParams
  const requested = Array.isArray(params.tab) ? params.tab[0] : params.tab
  const initialTab: TabKey =
    requested && VALID_TABS.has(requested) ? (requested as TabKey) : "home"

  const requestedAuth = Array.isArray(params.auth) ? params.auth[0] : params.auth
  const initialAuthMode = requestedAuth === "signup" ? "signUp" : "signIn"

  return <SiteClient initialTab={initialTab} initialAuthMode={initialAuthMode} />
}
