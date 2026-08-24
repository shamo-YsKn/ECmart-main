import { headers } from "next/headers"
import { SiteClient } from "@/components/site-client"
import { MobileSite } from "@/components/mobile/mobile-site"

const VALID_TABS = new Set(["home", "shops", "ranking", "robot", "gacha", "workbench", "account", "cart"])
type TabKey = "home" | "shops" | "ranking" | "robot" | "gacha" | "workbench" | "account" | "cart"
type SearchParams = Record<string, string | string[] | undefined>

function isMobileUserAgent(userAgent: string) {
  return /Android|iPhone|iPod|Mobile|Windows Phone|Opera Mini|IEMobile/i.test(userAgent)
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const requestHeaders = await headers()
  const userAgent = requestHeaders.get("user-agent") || ""

  // The mobile site intentionally does not depend on React hydration. This is
  // the compatibility path for phones whose browser can render HTML/CSS but
  // cannot bootstrap the current React/Next client runtime reliably.
  if (isMobileUserAgent(userAgent)) {
    return <MobileSite params={params} />
  }

  const requested = Array.isArray(params.tab) ? params.tab[0] : params.tab
  const initialTab: TabKey = requested && VALID_TABS.has(requested) ? requested as TabKey : "home"
  const requestedAuth = Array.isArray(params.auth) ? params.auth[0] : params.auth
  const initialAuthMode = requestedAuth === "signup" ? "signUp" : "signIn"
  return <SiteClient initialTab={initialTab} initialAuthMode={initialAuthMode} />
}
