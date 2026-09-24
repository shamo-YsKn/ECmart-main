import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { execFileSync } from "node:child_process"
import assert from "node:assert/strict"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

const require = createRequire(import.meta.url)
// Evaluate actual application modules with TS/alias support, without changing the app loader.
function loader(overrides = {}) {
  const cache = new Map()
  function load(file) {
    file = path.resolve(file)
    if (!path.extname(file)) file += fs.existsSync(file + ".ts") ? ".ts" : ".tsx"
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }; cache.set(file, module)
    const source = overrides[path.relative(process.cwd(), file).replaceAll("\\", "/")] ?? fs.readFileSync(file, "utf8")
    const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file })
    const resolve = (name) => name.startsWith("@/") ? load(name.slice(2)) : name.startsWith(".") ? load(path.resolve(path.dirname(file), name)) : require(name)
    new Function("require", "module", "exports", outputText)(resolve, module, module.exports)
    return module.exports
  }
  return load
}
const load = loader()
const pose = load("lib/robot-pose-2d.ts")
const { normalizeRobotConfig } = load("lib/robot-config.ts")
const { normalizeDioramaDocument } = load("lib/diorama-model.ts")
const { parseMuralPostRow } = load("lib/mural-model.ts")
const { parsePublicationSnapshot } = load("lib/community-model.ts")
const { ROBOT_VIEW_PARTS, ROBOT_VIEW_OPTIONS } = load("lib/robot-parts.ts")
const { RobotFallback } = load("components/robot/robot-fallback.tsx")
const { normalizeCustomItemDocument } = load("lib/custom-item-model.ts")
let count = 0
function check(name, fn) { fn(); count++; console.log(`PASS ${name}`) }
function svg(config, extra = {}) { return renderToStaticMarkup(React.createElement(RobotFallback, { config, ...extra })) }
const custom = { mode: "custom", preset: "stand", joints: {}, spatial: {
  leftUpperArm: { x: -20, y: -30, z: 18 }, rightUpperArm: { x: 25, y: 40, z: 5 },
  leftLowerArm: { x: -13, y: -10, z: -20 }, rightLowerArm: { x: 15, y: 30, z: 28 },
  leftUpperLeg: { x: -7, y: -25, z: -30 }, rightUpperLeg: { x: 12, y: 15, z: -24 },
  leftLowerLeg: { x: -5, y: -8, z: -35 }, rightLowerLeg: { x: 20, y: 20, z: -30 },
} }
for (const base of ["volta", "natty"]) for (const preset of ["stand", "wave", "cheer", "point", "custom"]) {
  const config = normalizeRobotConfig({ base, pose: preset === "custom" ? "stand" : preset, poseState: preset === "custom" ? custom : undefined, item: "flower" })
  const before = JSON.stringify(config)
  const left = pose.buildRobot2DLayout({ ...config, view: "side" })
  const right = pose.buildRobot2DLayout({ ...config, view: "side-right" })
  check(`${base}/${preset}: opposite view mirrors coordinates, preserves limb identity and Z`, () => {
    assert.equal(right.axis, "side")
    for (const joint of ["shoulders", "elbows", "hands", "hips", "knees", "feet"]) for (const limb of ["left", "right"]) {
      assert.ok(Math.abs(left[joint][limb].x + right[joint][limb].x - 300) < 1e-8)
      assert.equal(left[joint][limb].y, right[joint][limb].y)
      const restored = pose.pointFromViewToAxis(right[joint][limb], "side-right")
      assert.ok(Math.abs(restored.x - left[joint][limb].x) < 1e-8)
      assert.equal(restored.y, left[joint][limb].y)
    }
    assert.equal(JSON.stringify(config), before)
  })
  check(`${base}/${preset}: renderer swaps occlusion and keeps held item on same limb`, () => {
    const a = svg({ ...config, view: "side" }), b = svg({ ...config, view: "side-right" })
    assert.match(a, /data-layer="far" data-limb="left"/)
    assert.match(b, /data-layer="far" data-limb="right"/)
    assert.match(b, /data-layer="near" data-limb="left"/)
    assert.match(b, /translate\(300 0\) scale\(-1 1\)/)
    assert.ok(a.indexOf('data-held-item-layer="near"') > a.indexOf('data-layer="body"'))
    assert.ok(b.indexOf('data-held-item-layer="far"') < b.indexOf('data-layer="body"'))
  })
}
check("view selection and 3D yaw are consistent", () => {
  assert.equal(ROBOT_VIEW_OPTIONS.length, 4)
  assert.equal(ROBOT_VIEW_PARTS.side.label, "左側面")
  assert.equal(ROBOT_VIEW_PARTS["side-right"].label, "右側面")
  assert.equal(ROBOT_VIEW_PARTS.side.yaw, -ROBOT_VIEW_PARTS["side-right"].yaw)
  assert.equal(normalizeRobotConfig({ view: "side" }).view, "side")
  assert.equal(normalizeRobotConfig({ view: "side-right" }).view, "side-right")
  assert.equal(normalizeRobotConfig({ view: "invalid" }).view, "front")
})
check("both side views share the same YZ state and far/near labels reverse", () => {
  assert.equal(pose.poseAxisForView("side-right"), pose.poseAxisForView("side"))
  assert.equal(pose.limbRoleLabel("side-right", "left"), "手前側")
  const next = pose.updatePoseAxisLinked(custom, "side", {}, { rightUpperArm: { x: 25, y: -35, z: 12 } })
  assert.equal(next.spatial.rightUpperArm.x, custom.spatial.rightUpperArm.x)
  const config = normalizeRobotConfig({ pose: "stand", poseState: next })
  const left = pose.buildRobot2DLayout({ ...config, view: "side" }), right = pose.buildRobot2DLayout({ ...config, view: "side-right" })
  assert.equal(left.elbows.right.y, right.elbows.right.y)
})
check("collapsed projection has a zero pointer distance in canonical coordinates", () => {
  const parent = { x: 116, y: 104 }
  const visible = pose.pointFromAxisToView(parent, "side-right")
  const restored = pose.pointFromViewToAxis(visible, "side-right")
  assert.equal(Math.hypot(restored.x - parent.x, restored.y - parent.y), 0)
})
const document = normalizeDioramaDocument({ robots: [{ savedRobotId: "robot-a", view: "side-right" }], items: [] })
check("custom held artwork retains its adjustment and is rendered behind the right-side body", () => {
  const config = normalizeRobotConfig({ view: "side-right", heldItem: { kind: "custom", customItemId: "item-a", adjustment: { offsetX: 7, offsetY: -3, rotationDeg: 20, scale: 0.8 } } })
  const item = normalizeCustomItemDocument({ name: "tool", parts: [{ partType: "bolt", instanceId: "bolt-a" }] })
  const rendered = svg(config, { customItemDocument: item })
  const empty = svg(config)
  assert.ok(rendered.length > empty.length)
  assert.ok(rendered.indexOf('data-held-item-layer="far"') < rendered.indexOf('data-layer="body"'))
  assert.equal(config.heldItem.adjustment.offsetX, 7)
})
check("diorama and publication snapshot preserve right-side placement and config", () => {
  assert.equal(document.robots[0].view, "side-right")
  const snapshot = parsePublicationSnapshot({ schemaVersion: 1, document, robots: [{ id: "robot-a", name: "test", config: { view: "side-right" } }], customItems: [] })
  assert.equal(snapshot.document.robots[0].view, "side-right")
  assert.equal(snapshot.robots[0].config.view, "side-right")
})
check("mural parser preserves right-side view and legacy side", () => {
  for (const view of ["side", "side-right"]) {
    const post = parseMuralPostRow({ id: "test", user_id: "user", spot_id: "muroran-it", saved_robot_id: "robot-a", author_name: "test", robot_name: "test", robot_config: { view }, robot_view: view, review: "test", created_at: "2026-09-24", updated_at: "2026-09-24" })
    assert.equal(post.robotView, view); assert.equal(post.robotConfig.view, view)
  }
})
const baselineIndex = process.argv.indexOf("--baseline-zip")
if (baselineIndex >= 0) {
  const files = ["lib/robot-pose-2d.ts", "components/robot/robot-fallback.tsx"]
  const oldLoad = loader(Object.fromEntries(files.map(file => [file, execFileSync("unzip", ["-p", process.argv[baselineIndex + 1], file], { encoding: "utf8" })])))
  const oldPose = oldLoad(files[0])
  const OldRobot = oldLoad(files[1]).RobotFallback
  for (const base of ["volta", "natty"]) for (const view of ["front", "side", "back"]) for (const preset of ["stand", "wave", "cheer", "point", "custom"]) {
    const config = normalizeRobotConfig({ base, view, pose: preset === "custom" ? "stand" : preset, poseState: preset === "custom" ? custom : undefined, item: "flower" })
    check(`baseline ${base}/${view}/${preset}: unchanged coordinates and drawable SVG primitives`, () => {
      assert.deepEqual(pose.buildRobot2DLayout(config), oldPose.buildRobot2DLayout(config))
      const primitives = value => [...value.matchAll(/<(?:path|rect|circle|ellipse|line)\b[^>]*>/g)].map(m => m[0].replace(/ data-layer="[^"]*"/g, ""))
      assert.deepEqual(primitives(svg(config)), primitives(renderToStaticMarkup(React.createElement(OldRobot, { config }))))
    })
  }
}
const previewIndex = process.argv.indexOf("--preview")
if (previewIndex >= 0) {
  const sharp = require("sharp")
  const children = []
  for (const [row, base] of ["volta", "natty"].entries()) for (const [column, view] of ["front", "side", "side-right", "back"].entries()) {
    const markup = svg(normalizeRobotConfig({ base, view, pose: "stand", poseState: custom, item: "flower", accentColor: "#d74659" })).replace('<svg ', `<svg x="${column * 300}" y="${row * 355 + 35}" width="300" height="320" `).replaceAll("fallback-metal-", `metal-${row}-${column}-`).replaceAll("fallback-shadow-", `shadow-${row}-${column}-`)
    children.push(`<text x="${column * 300 + 150}" y="${row * 355 + 27}" text-anchor="middle" font-size="18">${base.toUpperCase()} / ${["FRONT", "LEFT SIDE", "RIGHT SIDE", "BACK"][column]}</text>`, markup)
  }
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720"><rect width="1200" height="720" fill="#f4f7fa"/>${children.join("")}</svg>`)).png().toFile(process.argv[previewIndex + 1])
}
console.log(`Side views: ${count} checks PASS`)
