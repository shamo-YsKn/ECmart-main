import { networkInterfaces } from "node:os"

/**
 * Next.js dev mode increasingly validates the browser origin used to request
 * development assets. When the site is opened from another device, the
 * browser origin is the PC's LAN IPv4 address rather than localhost.
 *
 * Build the allow-list at server startup so DHCP address changes do not leave
 * a stale, hard-coded IP in the repository.
 */
function localDevOrigins() {
  const values = new Set(["localhost", "127.0.0.1"])

  for (const addresses of Object.values(networkInterfaces())) {
    for (const entry of addresses ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        values.add(entry.address)
      }
    }
  }

  for (const origin of (process.env.MACHINOWA_ALLOWED_DEV_ORIGINS ?? "").split(",")) {
    const value = origin.trim()
    if (value) values.add(value)
  }

  return [...values]
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },

  // The app intentionally targets a somewhat wider browser range than the
  // zero-config Next.js 16 baseline. Transpiling client-heavy dependencies
  // reduces the chance of older mobile browsers failing while parsing a chunk.
  transpilePackages: [
    "@react-three/fiber",
    "three",
    "@supabase/supabase-js",
    "lucide-react",
  ],

  // Keep LAN development explicit and resilient to DHCP address changes.
  // This affects development only; production requests are not opened up by it.
  allowedDevOrigins: localDevOrigins(),
}

export default nextConfig
