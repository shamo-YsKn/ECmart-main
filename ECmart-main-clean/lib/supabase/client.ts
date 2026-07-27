import type { SupabaseClient, SupportedStorage } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabasePublishableKey &&
    !supabaseUrl.includes("your-project") &&
    !supabasePublishableKey.includes("your-publishable-key"),
)

let browserClient: SupabaseClient | null = null
let browserClientPromise: Promise<SupabaseClient | null> | null = null
const memoryStorage = new Map<string, string>()

function createTabStorage(): SupportedStorage {
  return {
    getItem(key: string) {
      try {
        return window.sessionStorage.getItem(key)
      } catch {
        return memoryStorage.get(key) ?? null
      }
    },
    setItem(key: string, value: string) {
      try {
        window.sessionStorage.setItem(key, value)
      } catch {
        memoryStorage.set(key, value)
      }
    },
    removeItem(key: string) {
      try {
        window.sessionStorage.removeItem(key)
      } catch {
        memoryStorage.delete(key)
      }
    },
  }
}

/**
 * Supabase is intentionally a dynamic import.
 * The shopping/workshop UI can hydrate and work without evaluating auth code.
 * Auth is loaded only after an explicit account/save action.
 */
export async function createClient(): Promise<SupabaseClient | null> {
  if (
    typeof window === "undefined" ||
    !isSupabaseConfigured ||
    !supabaseUrl ||
    !supabasePublishableKey
  ) {
    return null
  }

  if (browserClient) return browserClient
  if (browserClientPromise) return browserClientPromise

  browserClientPromise = import("@supabase/supabase-js")
    .then(({ createClient: createSupabaseClient }) => {
      browserClient = createSupabaseClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          storage: createTabStorage(),
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          // Client-only email/password auth does not need the SSR package's
          // PKCE-by-default path. This is friendlier to plain HTTP LAN testing.
          flowType: "implicit",
        },
      })
      return browserClient
    })
    .catch((error) => {
      browserClientPromise = null
      throw error
    })

  return browserClientPromise
}
