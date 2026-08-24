import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const root = process.cwd()
const failures = []
const ok = (condition, message) => { if (!condition) failures.push(message) }
const read = (file) => fs.readFileSync(path.join(root, file), "utf8")

const required = [
  "lib/workbench-snap.ts",
  "lib/robot-held-item.ts",
  "components/workbench/custom-item-workshop.tsx",
  "components/workbench/custom-item-preview.tsx",
  "components/robot/robot-workshop.tsx",
  "components/robot/robot-fallback.tsx",
  "PHASE_2_COMPLETE.md",
]
for (const file of required) ok(fs.existsSync(path.join(root, file)), `missing Phase 2 file: ${file}`)

const creation = read("lib/creation-model.ts")
ok(creation.includes("ownSocketId"), "snap attachment does not preserve the moving socket")

const parts = read("lib/workbench-parts.ts")
ok(parts.includes("sockets:"), "workbench socket definitions are missing")

const snap = read("lib/workbench-snap.ts")
ok(snap.includes("findSnapCandidate"), "snap candidate calculation is missing")
ok(snap.includes("translatePartTree"), "connected child translation is missing")
ok(snap.includes("reflowAttachedParts"), "attachment reflow after rotation/scale is missing")

const workbench = read("components/workbench/custom-item-workshop.tsx")
ok(workbench.includes("スナップ {snapEnabled"), "snap on/off UI is missing")
ok(workbench.includes("attachedTo"), "workbench does not save attachment relationships")
ok(workbench.includes("接続を外す"), "detach UI is missing")

const robotConfig = read("lib/robot-config.ts")
ok(robotConfig.includes("heldItem"), "RobotConfig normalization does not preserve held item reference")

const workshop = read("components/robot/robot-workshop.tsx")
ok(workshop.includes("マイアイテム"), "robot workshop custom item picker is missing")
ok(workshop.includes("updateCustomHeldAdjustment"), "custom item hand adjustment UI is missing")

const fallback = read("components/robot/robot-fallback.tsx")
ok(fallback.includes("HeldCustomItem"), "2D robot renderer does not render custom held items")

const account = read("lib/account-context.tsx")
ok(account.includes("保存済みロボットが装備"), "custom item deletion guard is missing")

if (failures.length) {
  console.error("Phase 2 validation failed:")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log("Phase 2 validation passed.")
