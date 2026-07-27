/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Development access from the network URL printed by Next.js.
  // Add another host here if the machine's network address changes.
  allowedDevOrigins: [
    "157.19.67.219",
  ],
}

export default nextConfig
