import fs from "node:fs"
import assert from "node:assert/strict"

let checks = 0
function check(name, fn) {
  fn()
  checks += 1
  console.log(`PASS ${name}`)
}

const page = fs.readFileSync("app/page.tsx", "utf8")
const mobileSite = fs.readFileSync("components/mobile/mobile-site.tsx", "utf8")
const workshop = fs.readFileSync("components/workbench/custom-item-workshop.tsx", "utf8")
const mobileServer = fs.readFileSync("lib/mobile-server.ts", "utf8")
const saveRoute = fs.readFileSync("app/api/mobile/custom-item/route.ts", "utf8")
const contextRoute = fs.readFileSync("app/api/mobile/workbench-context/route.ts", "utf8")
const draftRoute = fs.readFileSync("app/api/mobile/workbench-draft/route.ts", "utf8")

check("mobile workbench uses hydrated client route", () => {
  assert.match(page, /\["pose", "workbench"\]/)
})
check("mobile robot workshop exposes item workbench", () => {
  assert.match(mobileSite, /アイテム工作台を開く/)
  assert.match(mobileSite, /tab=workbench&mobile=1/)
})
check("touch canvas uses pointer events and touch-none", () => {
  assert.match(workshop, /onPointerMove=\{moveDrag\}/)
  assert.match(workshop, /onPointerDown=\{\(event\) => startDrag/)
  assert.match(workshop, /touch-none/)
})
check("mobile UI switches between parts and adjustment panels", () => {
  assert.match(workshop, /mobilePanel === "parts"/)
  assert.match(workshop, /mobilePanel === "adjust"/)
  assert.match(workshop, /選択パーツ調整/)
})
check("touch hit area is enlarged", () => {
  assert.match(workshop, /width="168" height="144"/)
})
check("mobile login bridge loads inventory and storage state", () => {
  assert.match(workshop, /api\/mobile\/workbench-context/)
  assert.match(contextRoute, /getMobileWorkbenchContext/)
})
check("mobile save uses server cookie bridge", () => {
  assert.match(workshop, /api\/mobile\/custom-item/)
  assert.match(saveRoute, /saveMobileCustomItem/)
  assert.match(mobileServer, /export async function saveMobileCustomItem/)
})
check("saved mobile custom items can be reopened", () => {
  assert.match(mobileSite, /工作台で編集/)
  assert.match(mobileSite, /account\.customItems/)
  assert.match(draftRoute, /CUSTOM_ITEM_DRAFT_KEY/)
})
check("AI item proposals can stage into mobile workbench", () => {
  assert.match(mobileSite, /source" value="idea-assistant/)
  assert.match(mobileSite, /工作台へ読み込む/)
})

check("saved mobile item can be equipped on robot", () => {
  assert.match(workshop, /heldItem.*customItemId/s)
  assert.match(mobileSite, /activeCustomItem/)
  assert.match(mobileSite, /customItemDocument=\{activeCustomItem\?\.document/)
})
check("front side back view controls remain available", () => {
  assert.match(workshop, /CUSTOM_ITEM_VIEW_OPTIONS/)
  assert.match(workshop, /正面：X（左右）/)
  assert.match(workshop, /側面：Z（奥行き）/)
  assert.match(workshop, /背面：正面の反対側/)
})

console.log(`Mobile workbench: ${checks} checks PASS`)
