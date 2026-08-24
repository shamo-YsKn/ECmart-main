import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const root = process.cwd()
const failures = []
const ok = (condition, message) => { if (!condition) failures.push(message) }
const read = (file) => fs.readFileSync(path.join(root, file), "utf8")

const required = [
  "lib/workbench-variants.ts",
  "lib/diorama-stages.ts",
  "components/diorama/diorama-stage-preview.tsx",
  "supabase/phase3-gacha-expansion-migration.sql",
  "PHASE_3_GACHA_EXPANSION.md",
]
for (const file of required) ok(fs.existsSync(path.join(root, file)), `missing Phase 3 file: ${file}`)

const types = read("lib/types.ts")
ok(types.includes('"workbench_part"'), "workbench_part gacha category is missing")
ok(types.includes('"diorama_stage"'), "diorama_stage gacha category is missing")

const gacha = read("lib/gacha.ts")
ok(gacha.includes("workbench-gold-nut"), "workbench gacha rewards are missing")
ok(gacha.includes("stage-muroran-it"), "diorama stage rewards are missing")
ok(gacha.includes("stage-factory-night"), "factory night stage is missing")

const variants = read("lib/workbench-variants.ts")
ok(variants.includes("purple-led"), "special workbench variants are missing")
ok(variants.includes("rewardId"), "variant reward ownership link is missing")

const workbench = read("components/workbench/custom-item-workshop.tsx")
ok(workbench.includes("ガチャ限定素材"), "workbench gacha palette is missing")
ok(workbench.includes("unlockedRewardIds"), "workbench unlock check is missing")
ok(workbench.includes("variantId"), "workbench variant placement is missing")

const account = read("lib/account-context.tsx")
ok(account.includes("ガチャで未獲得の特殊工作素材"), "server-backed custom item save guard is missing")

const stage = read("lib/diorama-stages.ts")
ok(stage.includes("室蘭工業大学"), "Muroran Institute of Technology stage is missing")
ok(stage.includes("白鳥大橋"), "Hakucho Bridge stage is missing")

const sql = read("supabase/phase3-gacha-expansion-migration.sql")

const fullSql = read("supabase/gacha-inventory-migration.sql")
const seedSection = fullSql.split("insert into public.gacha_rewards")[1]?.split("on conflict (id)")[0] ?? ""
const seedIds = [...seedSection.matchAll(/\('([^']+)',\s*'(?:body_color|accent_color|item|workbench_part|diorama_stage)'/g)].map((match) => match[1])
ok(new Set(seedIds).size === seedIds.length, "full gacha migration contains duplicate reward ids in one INSERT")
ok(sql.includes("gacha_rewards_category_check"), "gacha category constraint migration is missing")
ok(sql.includes("workbench_part"), "SQL workbench category is missing")
ok(sql.includes("diorama_stage"), "SQL diorama category is missing")

if (failures.length) {
  console.error("Phase 3 validation failed:")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log("Phase 3 validation passed.")
