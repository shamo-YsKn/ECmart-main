import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { execFileSync } from "node:child_process"
import assert from "node:assert/strict"

const require = createRequire(import.meta.url)
const ts = require("typescript")
function loader(overrides = {}) {
  const cache = new Map()
  function load(file) {
    file = path.resolve(file)
    if (!path.extname(file)) file += fs.existsSync(file + ".ts") ? ".ts" : ".tsx"
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }; cache.set(file, module)
    const key = path.relative(process.cwd(), file).replaceAll("\\", "/")
    const source = overrides[key] ?? fs.readFileSync(file, "utf8")
    const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file })
    const resolve = name => name.startsWith("@/") ? load(name.slice(2)) : name.startsWith(".") ? load(path.resolve(path.dirname(file), name)) : require(name)
    new Function("require", "module", "exports", outputText)(resolve, module, module.exports)
    return module.exports
  }
  return load
}
const load = loader()
const itemView = load("lib/custom-item-view.ts")
const model = load("lib/custom-item-model.ts")
const snap = load("lib/workbench-snap.ts")
let count = 0
function check(name, fn) { fn(); count += 1; console.log(`PASS ${name}`) }

const legacy = {
  schemaVersion: 1, kind: "custom-item", name: "legacy", editorMode: "2d", coordinateSpace: "item-workbench-v1",
  parts: [
    { instanceId: "bolt-a", partType: "bolt", transform: { position: [90, -30, 0], rotationDeg: [0, 0, 25], scale: [1, 1, 1] } },
    { instanceId: "nut-a", partType: "hex_nut", transform: { position: [-55, 28, 0], rotationDeg: [0, 0, -12], scale: [0.9, 0.9, 0.9] } },
  ],
}
const normalizedLegacy = model.normalizeCustomItemDocument(legacy)
check("v1 document upgrades without moving legacy front artwork", () => {
  assert.equal(normalizedLegacy.coordinateSpace, "item-workbench-v2")
  assert.deepEqual(normalizedLegacy.parts[0].transform.position, [90, -30, 0])
  assert.deepEqual(normalizedLegacy.parts[0].transform.rotationDeg, [0, 0, 25])
})
check("front/side/back project one XYZ position consistently", () => {
  const p = [30, 40, 70]
  assert.deepEqual(itemView.projectItemPosition(p, "front"), { x: 30, y: 40, depth: 70 })
  assert.deepEqual(itemView.projectItemPosition(p, "side"), { x: 70, y: 40, depth: 30 })
  assert.deepEqual(itemView.projectItemPosition(p, "back"), { x: -30, y: 40, depth: -70 })
})
check("editing each orthographic plane preserves the hidden axis", () => {
  const p = [30, 40, 70]
  assert.deepEqual(itemView.translateItemPositionInView(p, "front", 12, -5), [42, 35, 70])
  assert.deepEqual(itemView.translateItemPositionInView(p, "side", 12, -5), [30, 35, 82])
  assert.deepEqual(itemView.translateItemPositionInView(p, "back", 12, -5), [18, 35, 70])
})
check("view rotation maps to stored 3D axes", () => {
  const base = [13, 7, 26]
  assert.equal(itemView.itemRotationForView(base, "front"), 26)
  assert.equal(itemView.itemRotationForView(base, "back"), -26)
  assert.equal(itemView.itemRotationForView(base, "side"), 13)
  assert.deepEqual(itemView.updateItemRotationForView(base, "back", 44), [13, 7, -44])
  assert.deepEqual(itemView.updateItemRotationForView(base, "side", -31), [-31, 7, 26])
})
check("depth sorting reverses correctly between front and back", () => {
  const parts = [
    model.normalizeCustomItemPart({ instanceId: "far", partType: "washer", transform: { position: [0, 0, -40] } }),
    model.normalizeCustomItemPart({ instanceId: "near", partType: "washer", transform: { position: [0, 0, 50] } }),
  ]
  assert.deepEqual(itemView.itemPartsForView(parts, "front").map(entry => entry.part.instanceId), ["far", "near"])
  assert.deepEqual(itemView.itemPartsForView(parts, "back").map(entry => entry.part.instanceId), ["near", "far"])
})
check("opposite side can reverse only the occlusion order without changing coordinates", () => {
  const parts = [
    model.normalizeCustomItemPart({ instanceId: "left", partType: "washer", transform: { position: [-50, 0, 0] } }),
    model.normalizeCustomItemPart({ instanceId: "right", partType: "washer", transform: { position: [50, 0, 0] } }),
  ]
  assert.deepEqual(itemView.itemPartsForView(parts, "side").map(entry => entry.part.instanceId), ["left", "right"])
  assert.deepEqual(itemView.itemPartsForView(parts, "side", true).map(entry => entry.part.instanceId), ["right", "left"])
})
check("3D socket alignment is exact in all three projections", () => {
  const target = model.normalizeCustomItemPart({ instanceId: "target", partType: "hex_nut", transform: { position: [45, -15, 60], rotationDeg: [20, 0, 10], scale: [1, 1, 1] } })
  const moving = model.normalizeCustomItemPart({ instanceId: "moving", partType: "metal_rod", transform: { position: [-70, 90, -40], rotationDeg: [-15, 0, 30], scale: [1, 1, 1] } })
  const targetWorld = snap.socketWorldPoint3D(target, "center")
  const aligned = snap.alignPartSocketToWorldPoint(moving, "center", targetWorld)
  const ownWorld = snap.socketWorldPoint3D(aligned, "center")
  for (let i = 0; i < 3; i += 1) assert.ok(Math.abs(targetWorld[i] - ownWorld[i]) < 1e-9)
  for (const view of ["front", "side", "back"]) {
    const a = itemView.projectItemPosition(targetWorld, view), b = itemView.projectItemPosition(ownWorld, view)
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-9)
  }
})
check("side-view snap candidate uses projected 3D socket coordinates", () => {
  const target = model.normalizeCustomItemPart({ instanceId: "target", partType: "hex_nut", transform: { position: [20, 5, 75] } })
  const moving = model.normalizeCustomItemPart({ instanceId: "moving", partType: "metal_rod", transform: { position: [-30, 5, 78] } })
  const candidate = snap.findSnapCandidate(moving, [moving, target], 10, new Set(), "side")
  assert.ok(candidate)
  assert.ok(Number.isFinite(candidate.targetWorldPoint[2]))
})

const workshop = fs.readFileSync(path.join(process.cwd(), "components/workbench/custom-item-workshop.tsx"), "utf8")
const preview = fs.readFileSync(path.join(process.cwd(), "components/workbench/custom-item-preview.tsx"), "utf8")
const shape = fs.readFileSync(path.join(process.cwd(), "components/workbench/workbench-part-shape.tsx"), "utf8")
const robot = fs.readFileSync(path.join(process.cwd(), "components/robot/robot-fallback.tsx"), "utf8")
check("workshop exposes front/side/back editing and XYZ feedback", () => {
  for (const token of ["CUSTOM_ITEM_VIEW_OPTIONS", "3D位置", "正面：X（左右）/ Y（上下）", "側面：Z（奥行き）/ Y（上下）", "背面：正面の反対側"]) assert.ok(workshop.includes(token), token)
})
check("preview and part renderer are view-aware", () => {
  for (const token of ["itemPartsForView", "itemViewTransform", "view?: CustomItemView"]) assert.ok(preview.includes(token), token)
  assert.ok(shape.includes('view === "side"'))
  assert.ok(shape.includes('view === "back"'))
})
check("held custom item follows robot front/side/back view", () => {
  assert.ok(robot.includes('itemView={config.view === "back" ? "back" : "front"}'))
  assert.ok(robot.includes('itemView="side"'))
  assert.ok(robot.includes('<CustomItemArtwork document={document} view={view} reverseDepth={reverseDepth} />'))
  assert.ok(robot.includes('reverseItemDepth={opposite}'))
})

const baselineIndex = process.argv.indexOf("--baseline-zip")
if (baselineIndex >= 0) {
  const oldShape = execFileSync("unzip", ["-p", process.argv[baselineIndex + 1], "components/workbench/workbench-part-shape.tsx"], { encoding: "utf8" })
  const mainCurrent = shape.slice(shape.indexOf("export function WorkbenchPartShape"))
  const mainOld = oldShape.slice(oldShape.indexOf("export function WorkbenchPartShape"))
  function branch(source, type, nextType) {
    const start = source.indexOf(`if (type === "${type}")`)
    const end = nextType ? source.indexOf(`if (type === "${nextType}")`, start + 1) : source.indexOf("const ledColor", start + 1)
    return source.slice(start, end).replace(/\s+/g, " ").trim()
  }
  for (const [type, next] of [["hex_nut","washer"],["washer","bolt"],["bolt","flat_head_screw"],["metal_rod","wire"],["wire","spring"],["spring",null]]) {
    check(`legacy front primitive unchanged: ${type}`, () => assert.equal(branch(mainCurrent, type, next), branch(mainOld, type, next)))
  }
}
console.log(`Custom item views: ${count} checks PASS`)
