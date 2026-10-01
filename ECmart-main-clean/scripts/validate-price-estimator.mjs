import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import assert from "node:assert/strict"

const require = createRequire(import.meta.url)
const ts = require("typescript")
const cache = new Map()
function load(file) {
  file = path.resolve(file)
  if (!path.extname(file)) file += fs.existsSync(file + ".ts") ? ".ts" : ".tsx"
  if (cache.has(file)) return cache.get(file).exports
  const module = { exports: {} }
  cache.set(file, module)
  const source = fs.readFileSync(file, "utf8")
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: file,
  })
  const resolve = name => name.startsWith("@/") ? load(name.slice(2)) : name.startsWith(".") ? load(path.resolve(path.dirname(file), name)) : require(name)
  new Function("require", "module", "exports", outputText)(resolve, module, module.exports)
  return module.exports
}

const model = load("lib/custom-item-model.ts")
const pricing = load("lib/price-estimator.ts")
let count = 0
function check(name, fn) { fn(); count += 1; console.log(`PASS ${name}`) }

function part(instanceId, partType, position = [0, 0, 0], attachedTo, scale = 1) {
  return model.normalizeCustomItemPart({
    instanceId,
    partType,
    transform: { position, rotationDeg: [0, 0, 0], scale: [scale, scale, scale] },
    ...(attachedTo ? { attachedTo } : {}),
  })
}
function doc(parts) {
  return model.normalizeCustomItemDocument({ schemaVersion: 1, kind: "custom-item", name: "test", editorMode: "2d", coordinateSpace: "item-workbench-v2", parts })
}

check("official base prices are fixed", () => {
  assert.equal(pricing.robotBaseReferencePrice("volta"), 1150)
  assert.equal(pricing.robotBaseReferencePrice("natty"), 1250)
})

const simple = doc([
  part("a", "bolt", [-30, 0, 0]),
  part("b", "hex_nut", [30, 0, 0], { instanceId: "a", socketId: "shaft", ownSocketId: "center" }),
  part("c", "washer", [55, 0, 0], { instanceId: "b", socketId: "right", ownSocketId: "center" }),
])
check("small ordinary item stays in standard tier", () => {
  const result = pricing.estimateCustomItemPrice(simple)
  assert.equal(result.tier, "standard")
  assert.equal(result.surcharge, 0)
  assert.ok(result.score < 18)
})

const detailedParts = []
const detailedTypes = ["bolt", "hex_nut", "washer", "metal_rod", "bolt", "hex_nut", "washer", "metal_rod"]
for (let i = 0; i < detailedTypes.length; i += 1) {
  detailedParts.push(part(`d${i}`, detailedTypes[i], [(i - 3.5) * 24, (i % 2) * 18, 0], i ? { instanceId: `d${i-1}`, socketId: "center", ownSocketId: "center" } : undefined))
}
const detailed = doc(detailedParts)
check("medium connected item maps to detailed tier", () => {
  const result = pricing.estimateCustomItemPrice(detailed)
  assert.equal(result.tier, "detailed")
  assert.equal(result.surcharge, 750)
  assert.ok(result.score >= 18 && result.score < 38)
})

const complexTypes = ["bolt","hex_nut","washer","metal_rod","wire","spring","led_red","bolt","wire","hex_nut","washer","spring"]
const complexParts = complexTypes.map((type, i) => part(
  `c${i}`,
  type,
  [(i % 4 - 1.5) * 45, (Math.floor(i / 4) - 1) * 45, (i % 3 - 1) * 24],
  i ? { instanceId: `c${i-1}`, socketId: "center", ownSocketId: "center" } : undefined,
))
const complex = doc(complexParts)
check("dense special-parts item maps to complex tier", () => {
  const result = pricing.estimateCustomItemPrice(complex)
  assert.equal(result.tier, "complex")
  assert.equal(result.surcharge, 1050)
  assert.ok(result.score >= 38)
  assert.equal(result.largeStructure, false)
})

const large = doc([
  part("l0", "metal_rod", [-270, 0, 0]),
  part("l1", "metal_rod", [-160, 0, 0]),
  part("l2", "metal_rod", [-50, 0, 0]),
  part("l3", "metal_rod", [60, 0, 0]),
  part("l4", "metal_rod", [170, 0, 0]),
  part("l5", "metal_rod", [270, 0, 0]),
])
check("large footprint forces large tier independently of raw score", () => {
  const result = pricing.estimateCustomItemPrice(large)
  assert.equal(result.tier, "large")
  assert.equal(result.surcharge, 2250)
  assert.equal(result.largeStructure, true)
  assert.ok(result.largeStructureReasons.length > 0)
})

check("variant color does not itself add structural complexity", () => {
  const plain = doc([part("p", "hex_nut")])
  const variant = model.normalizeCustomItemDocument({ ...plain, parts: [{ ...plain.parts[0], variantId: "gold-nut" }] })
  assert.equal(pricing.estimateCustomItemPrice(plain).score, pricing.estimateCustomItemPrice(variant).score)
  assert.equal(pricing.estimateCustomItemPrice(variant).features.variantPartCount, 1)
})

check("robot total adds custom surcharge only for a custom held item", () => {
  const base = { base: "volta", size: 55, bodyColor: "#c9a24b", accentColor: "#111111", pose: "stand", item: "wrench", view: "front", name: "test", heldItem: { kind: "builtin", item: "wrench" } }
  assert.equal(pricing.estimateRobotReferencePrice(base, complex).total, 1150)
  const custom = { ...base, heldItem: { kind: "custom", customItemId: "x", adjustment: { offsetX: 0, offsetY: 0, rotationDeg: 0, scale: 1 } } }
  assert.equal(pricing.estimateRobotReferencePrice(custom, complex).total, 2200)
})

check("Natty uses 1,250 yen base with same complexity surcharge", () => {
  const config = { base: "natty", size: 55, bodyColor: "#c9a24b", accentColor: "#111111", pose: "stand", item: "none", view: "front", name: "test", heldItem: { kind: "custom", customItemId: "x", adjustment: { offsetX: 0, offsetY: 0, rotationDeg: 0, scale: 1 } } }
  assert.equal(pricing.estimateRobotReferencePrice(config, detailed).total, 2000)
})

check("empty custom item contributes no surcharge", () => {
  const empty = model.createEmptyCustomItemDocument()
  const result = pricing.estimateCustomItemPrice(empty)
  assert.equal(result.score, 0)
  assert.equal(result.tier, "standard")
  assert.equal(result.surcharge, 0)
})

const workshopSource = fs.readFileSync("components/workbench/custom-item-workshop.tsx", "utf8")
const robotWorkshopSource = fs.readFileSync("components/robot/robot-workshop.tsx", "utf8")
const packageSource = fs.readFileSync("package.json", "utf8")
check("item workshop exposes live score and price breakdown", () => {
  assert.ok(workshopSource.includes("価格スコア"))
  assert.ok(workshopSource.includes("参考価格判定"))
  assert.ok(workshopSource.includes("priceEstimate.components"))
})
check("robot workshop displays calculated reference price", () => {
  assert.ok(robotWorkshopSource.includes("estimateRobotReferencePrice"))
  assert.ok(robotWorkshopSource.includes("参考価格"))
  assert.ok(robotWorkshopSource.includes("customItemSurcharge"))
})
check("price validator is included in project check command", () => {
  assert.ok(packageSource.includes("validate:price-estimator"))
  assert.ok(packageSource.includes("npm run validate:price-estimator"))
})

console.log(`Price estimator: ${count} checks PASS`)
