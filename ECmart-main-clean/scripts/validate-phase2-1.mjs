import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const root = process.cwd()
const failures = []
const ok = (condition, message) => { if (!condition) failures.push(message) }
const read = (file) => fs.readFileSync(path.join(root, file), "utf8")

const required = [
  "components/workbench/custom-item-workshop.tsx",
  "components/workbench/custom-item-preview.tsx",
  "components/workbench/workbench-part-shape.tsx",
  "lib/custom-item-model.ts",
  "lib/workbench-parts.ts",
  "supabase/custom-items-migration.sql",
  "PHASE_2_1_ITEM_WORKBENCH.md",
]
for (const file of required) ok(fs.existsSync(path.join(root, file)), `missing Phase 2-1 file: ${file}`)

const editor = read("components/workbench/custom-item-workshop.tsx")
ok(editor.includes("onPointerMove"), "workbench drag handling is missing")
ok(editor.includes("moveLayer"), "workbench layer ordering is missing")
ok(editor.includes("duplicateSelected"), "workbench duplicate action is missing")
ok(editor.includes("saveCustomItem"), "workbench account save is missing")

const sql = read("supabase/custom-items-migration.sql")
ok(sql.includes("create table if not exists public.custom_items"), "custom_items table migration is missing")
ok(sql.includes("enable row level security"), "custom_items RLS is missing")
ok(sql.includes("auth.uid() = user_id"), "custom_items own-user policy is missing")

const account = read("lib/account-context.tsx")
ok(account.includes("savedCustomItems"), "account context does not load custom items")
ok(account.includes("deleteCustomItem"), "account context does not delete custom items")

if (failures.length) {
  console.error("Phase 2-1 validation failed:")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log("Phase 2-1 validation passed.")
