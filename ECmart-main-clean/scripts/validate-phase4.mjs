import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const root = process.cwd()
const failures = []
const ok = (condition, message) => { if (!condition) failures.push(message) }
const read = (file) => fs.readFileSync(path.join(root, file), "utf8")

const required = [
  "lib/diorama-model.ts",
  "components/diorama/diorama-scene.tsx",
  "components/diorama/diorama-workshop.tsx",
  "supabase/dioramas-migration.sql",
  "PHASE_4_DIORAMA_EDITOR.md",
]
for (const file of required) ok(fs.existsSync(path.join(root, file)), `missing Phase 4 file: ${file}`)

const model = read("lib/diorama-model.ts")
ok(model.includes("DIORAMA_DRAFT_KEY"), "diorama re-edit draft key is missing")
ok(model.includes("normalizeDioramaDocument"), "diorama document normalization is missing")
ok(model.includes("placementId"), "diorama placement id support is missing")

const editor = read("components/diorama/diorama-workshop.tsx")
ok(editor.includes("onPointerDown"), "diorama drag editing is missing")
ok(editor.includes("moveLayer"), "diorama layer editing is missing")
ok(editor.includes("duplicateSelected"), "diorama duplication is missing")
ok(editor.includes("saveDiorama"), "diorama account save is missing")

const account = read("lib/account-context.tsx")
ok(account.includes("savedDioramas"), "account context does not load dioramas")
ok(account.includes("saveDiorama"), "account context does not save dioramas")
ok(account.includes("保存済みジオラマに配置"), "robot/item deletion guard for dioramas is missing")

const sql = read("supabase/dioramas-migration.sql")
ok(sql.includes("create table if not exists public.dioramas"), "dioramas table migration is missing")
ok(sql.includes("enable row level security"), "dioramas RLS is missing")
ok(sql.includes("auth.uid() = user_id"), "dioramas own-user policy is missing")

const site = read("components/site-client.tsx")
ok(site.includes('tab === "diorama"'), "diorama site route is missing")

if (failures.length) {
  console.error("Phase 4 validation failed:")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log("Phase 4 validation passed.")
