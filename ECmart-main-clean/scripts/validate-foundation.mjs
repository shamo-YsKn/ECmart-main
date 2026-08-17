import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), "utf8")
const failures = []
const ok = (condition, message) => { if (!condition) failures.push(message) }

const requiredFiles = [
  "PROJECT_ROADMAP.md",
  "STABILITY_BASELINE.md",
  "docs/CREATION_DATA_MODEL.md",
  "lib/creation-model.ts",
  "lib/robot-config.ts",
  "lib/robot-customization.ts",
]
for (const file of requiredFiles) {
  ok(fs.existsSync(path.join(root, file)), `missing required foundation file: ${file}`)
}

const packageJson = JSON.parse(read("package.json"))
ok(Boolean(packageJson.dependencies?.next), "Next.js dependency is missing")
ok(Boolean(packageJson.dependencies?.react), "React dependency is missing")
ok(Boolean(packageJson.dependencies?.["@react-three/fiber"]), "React Three Fiber dependency is missing")
ok(Boolean(packageJson.dependencies?.["@supabase/supabase-js"]), "Supabase dependency is missing")

const gachaSql = read("supabase/gacha-inventory-migration.sql")
ok(
  gachaSql.includes("on conflict on constraint user_gacha_inventory_pkey"),
  "gacha migration does not contain the reward_id ambiguity fix",
)

const nextConfig = read("next.config.mjs")
ok(!nextConfig.includes("157.19.67.219"), "stale hard-coded LAN IP remains in next.config.mjs")

const workshop = read("components/robot/robot-workshop.tsx")
ok(workshop.includes("ROBOT_BODY_COLORS"), "desktop workshop is not using shared robot color catalog")
ok(workshop.includes("normalizeRobotConfig"), "desktop workshop draft loading is not normalized")

const mobileSite = read("components/mobile/mobile-site.tsx")
ok(mobileSite.includes("ROBOT_BODY_COLORS"), "mobile workshop is not using shared robot color catalog")
ok(mobileSite.includes("normalizeRobotConfig"), "mobile workshop is not using shared robot config normalization")

const mobileApi = read("app/api/mobile/robot/route.ts")
ok(mobileApi.includes("normalizeRobotConfig"), "mobile robot save API is not using shared normalization")

if (failures.length) {
  console.error("Foundation validation failed:")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log("Foundation validation passed.")
