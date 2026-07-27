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

  // Development access from the current network address.
  allowedDevOrigins: ["157.19.67.219"],
}

export default nextConfig
