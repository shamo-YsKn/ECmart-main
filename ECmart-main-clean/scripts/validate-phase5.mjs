import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const mustExist = [
  "lib/mural-spots.ts",
  "lib/mural-model.ts",
  "lib/mural-npc.ts",
  "components/mural/mural-view.tsx",
  "components/mural/muroran-mini-map.tsx",
  "components/mural/mural-background.tsx",
  "supabase/mural-community-migration.sql",
]

const failures = []
for (const file of mustExist) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing: ${file}`)
}

const spots = fs.readFileSync(path.join(root, "lib/mural-spots.ts"), "utf8")
for (const id of ["muroran-it", "chikyu-misaki", "hakucho-bridge", "shop-ippei", "shop-isehiro", "shop-tetsu"]) {
  if (!spots.includes(`id: "${id}"`)) failures.push(`spot missing: ${id}`)
}

const npc = fs.readFileSync(path.join(root, "lib/mural-npc.ts"), "utf8")
for (const token of ["localMuralDateKey", "ambientRobotCount", "generateAmbientMuralRobots", "realPostCount"]) {
  if (!npc.includes(token)) failures.push(`NPC rule missing: ${token}`)
}

const view = fs.readFileSync(path.join(root, "components/mural/mural-view.tsx"), "utf8")
for (const token of ["街のロボット", "ユーザー投稿", "mural_post_likes", "ProductCard", "壁画へ投稿", "新着", "人気"]) {
  if (!view.includes(token)) failures.push(`mural UI missing: ${token}`)
}

const site = fs.readFileSync(path.join(root, "components/site-client.tsx"), "utf8")
if (!site.includes('{ key: "mural", label: "まち歩き"')) failures.push("desktop navigation missing mural tab")

const mobile = fs.readFileSync(path.join(root, "components/mobile/mobile-site.tsx"), "utf8")
if (!mobile.includes('["mural", "まち歩き"]')) failures.push("mobile navigation missing mural tab")
if (!mobile.includes('tab === "mural"')) failures.push("mobile read-only mural view missing")

const sql = fs.readFileSync(path.join(root, "supabase/mural-community-migration.sql"), "utf8")
for (const token of ["public.mural_posts", "public.mural_post_likes", "mural_posts_select_public", "get_mural_like_counts", "mural_likes_select_own", "unique (user_id, spot_id, mural_variant, saved_robot_id)"]) {
  if (!sql.includes(token)) failures.push(`SQL missing: ${token}`)
}

if (failures.length) {
  console.error("PHASE5_VALIDATE_FAILED")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log("PHASE5_VALIDATE_OK")
