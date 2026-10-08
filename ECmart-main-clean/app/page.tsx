import { headers } from "next/headers"
import { SiteClient } from "@/components/site-client"
import { MobileSite } from "@/components/mobile/mobile-site"

const VALID_TABS = new Set(["home", "shops", "mural", "gallery", "ranking", "robot", "gacha", "workbench", "diorama", "pose", "account", "cart"])
type TabKey = "home" | "shops" | "mural" | "gallery" | "ranking" | "robot" | "gacha" | "workbench" | "diorama" | "pose" | "account" | "cart"
type SearchParams = Record<string, string | string[] | undefined>

function isMobileUserAgent(userAgent: string, secChUaMobile: string) {
  return (
    secChUaMobile === "?1" ||
    /Android|iPhone|iPod|Mobile|Windows Phone|Opera Mini|IEMobile/i.test(userAgent)
  )
}

function isCompatRequested(params: SearchParams) {
  const compat = Array.isArray(params.compat) ? params.compat[0] : params.compat
  return compat === "1" || compat === "mobile" || compat === "server"
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const requestHeaders = await headers()
  const userAgent = requestHeaders.get("user-agent") || ""
  const secChUaMobile = requestHeaders.get("sec-ch-ua-mobile") || ""
  const requested = Array.isArray(params.tab) ? params.tab[0] : params.tab
  const initialTab: TabKey = requested && VALID_TABS.has(requested) ? requested as TabKey : "home"
  const requestedAuth = Array.isArray(params.auth) ? params.auth[0] : params.auth
  const initialAuthMode = requestedAuth === "signup" ? "signUp" : "signIn"

  // Explicit compat mode always wins. It is the safe fallback when the React
  // client runtime cannot hydrate on a particular phone/browser.
  if (isCompatRequested(params)) {
    return <MobileSite params={params} />
  }

  // Mobile normally uses the lightweight server-rendered site. Free-pose and
  // item-workbench are the two touch editors that intentionally use the
  // hydrated client runtime so Pointer Events can handle finger dragging.
  if (isMobileUserAgent(userAgent, secChUaMobile) && !(["pose", "workbench"] as TabKey[]).includes(initialTab)) {
    return <MobileSite params={params} />
  }

  return <SiteClient initialTab={initialTab} initialAuthMode={initialAuthMode} />
}
