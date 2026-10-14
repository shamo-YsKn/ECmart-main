import fs from 'node:fs'
import assert from 'node:assert/strict'

let checks = 0
function check(name, fn) { fn(); checks += 1; console.log(`PASS ${name}`) }

const mobileSite = fs.readFileSync('components/mobile/mobile-site.tsx', 'utf8')
const enhance = fs.readFileSync('public/mobile-enhance.js', 'utf8')
const cartRoute = fs.readFileSync('app/api/mobile/cart/route.ts', 'utf8')
const workbenchDraft = fs.readFileSync('app/api/mobile/workbench-draft/route.ts', 'utf8')
const workshop = fs.readFileSync('components/workbench/custom-item-workshop.tsx', 'utf8')
const poseStudio = fs.readFileSync('components/robot/robot-pose-studio.tsx', 'utf8')

check('mobile cart forms use native POST fallback', () => {
  assert.match(mobileSite, /action="\/api\/mobile\/cart" method="post" data-no-ajax="true"/)
})
check('mobile ajax explicitly bypasses cart and workbench staging routes', () => {
  assert.match(enhance, /action\.pathname === "\/api\/mobile\/cart"/)
  assert.match(enhance, /action\.pathname === "\/api\/mobile\/workbench-draft"/)
})
check('cart native redirect stays relative to the external device host', () => {
  assert.match(cartRoute, /Location: location/)
  assert.doesNotMatch(cartRoute, /NextResponse\.redirect\(new URL\(returnTo, request\.url\)/)
})
check('cart failure is surfaced on cart page', () => {
  assert.match(cartRoute, /cartError=1/)
  assert.match(mobileSite, /カートを更新できませんでした/)
})
check('AI proposal staging bypasses ajax so sessionStorage script executes', () => {
  assert.match(mobileSite, /action="\/api\/mobile\/workbench-draft" method="post" data-no-ajax="true" className="mt-2"/)
  assert.match(mobileSite, /name="robotConfig" value=\{JSON\.stringify\(candidate\.config\)\}/)
})
check('staged workbench proposal preserves robot proposal context', () => {
  assert.match(workbenchDraft, /returnRobotConfig/)
  assert.match(workbenchDraft, /normalizeRobotConfig/)
  assert.match(workshop, /setReturnRobotConfig/)
})
check('equipping staged item returns to proposal robot config', () => {
  assert.match(workshop, /const base = returnRobotConfig \?\? normalizeRobotConfig/)
  assert.match(workshop, /url\.searchParams\.set\("bodyColor", base\.bodyColor\)/)
  assert.match(workshop, /url\.searchParams\.set\("poseState", JSON\.stringify\(base\.poseState\)\)/)
})

check('manual mobile workbench preserves current robot and custom pose context', () => {
  assert.match(mobileSite, /name="source" value="mobile-robot"/)
  assert.match(mobileSite, /name="robotConfig" value=\{JSON\.stringify\(config\)\}/)
  assert.match(workbenchDraft, /sourceRaw === "mobile-robot"/)
  assert.match(workshop, /現在のロボット設定を引き継ぎました/)
})

check('mobile pose editor marks explicit mobile query', () => {
  assert.match(mobileSite, /\["mobile", "1"\]/)
})
check('pose studio prefers URL config over stale session draft', () => {
  const queryIndex = poseStudio.indexOf('const queryConfig = readConfigFromSearch()')
  const draftIndex = poseStudio.indexOf('const raw = loadRobotPoseStudioDraft()')
  assert.ok(queryIndex >= 0 && draftIndex > queryIndex)
})
check('custom pose state remains serialized across mobile workshop links', () => {
  assert.match(mobileSite, /entries\.push\(\["poseState", JSON\.stringify\(config\.poseState\)\]\)/)
  assert.match(mobileSite, /poseState: parseJsonParam\(one\(params\.poseState\)\)/)
})

console.log(`Mobile external-device fixes: ${checks} checks PASS`)
