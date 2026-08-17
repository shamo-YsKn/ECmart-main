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

  // Additional development origins are optional. Normal LAN access uses the
  // hostname passed to `next dev`; add proxy/custom origins only when needed.
  ...(process.env.MACHINOWA_ALLOWED_DEV_ORIGINS
    ? { allowedDevOrigins: process.env.MACHINOWA_ALLOWED_DEV_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean) }
    : {}),
}

export default nextConfig
