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
  const resolve = (name) => name.startsWith("@/")
    ? load(name.slice(2))
    : name.startsWith(".")
      ? load(path.resolve(path.dirname(file), name))
      : require(name)
  new Function("require", "module", "exports", outputText)(resolve, module, module.exports)
  return module.exports
}

const model = load("lib/custom-item-model.ts")
const pricing = load("lib/price-estimator.ts")

function part(instanceId, partType, position = [0, 0, 0], attachedTo, scale = 1) {
  return model.normalizeCustomItemPart({
    instanceId,
    partType,
    transform: { position, rotationDeg: [0, 0, 0], scale: [scale, scale, scale] },
    ...(attachedTo ? { attachedTo } : {}),
  })
}

function chain(spec) {
  return spec.map((entry, index) => part(
    entry.id,
    entry.type,
    entry.position,
    index ? { instanceId: spec[index - 1].id, socketId: "center", ownSocketId: "center" } : undefined,
    entry.scale ?? 1,
  ))
}

function doc(name, parts) {
  return model.normalizeCustomItemDocument({
    schemaVersion: 1,
    kind: "custom-item",
    name,
    editorMode: "2d",
    coordinateSpace: "item-workbench-v2",
    parts,
  })
}

const cases = [
  {
    id: "ultra-simple",
    label: "超シンプル小物",
    expectedTier: "standard",
    rationale: "2部品・1接続のため通常商品の無料枠",
    document: doc("超シンプル小物", [
      part("u0", "hex_nut", [0, 0, 0]),
      part("u1", "bolt", [65, 0, 0], { instanceId: "u0", socketId: "center", ownSocketId: "center" }),
    ]),
  },
  {
    id: "fishing-rod",
    label: "簡単な釣竿",
    expectedTier: "standard",
    rationale: "公式通常シリーズに釣り作品があるため、長さだけでは加算しない",
    document: doc("簡単な釣竿", [
      part("f0", "metal_rod", [-70, 0, 0]),
      part("f1", "metal_rod", [45, -5, 0], { instanceId: "f0", socketId: "center", ownSocketId: "center" }),
      part("f2", "wire", [145, 38, 0], { instanceId: "f1", socketId: "center", ownSocketId: "center" }),
      part("f3", "hex_nut", [-135, 5, 0], { instanceId: "f0", socketId: "center", ownSocketId: "center" }),
    ]),
  },
  {
    id: "frying-pan",
    label: "フライパン風",
    expectedTier: "standard",
    rationale: "少数部品の一般小物は通常シリーズ相当",
    document: doc("フライパン風", [
      part("p0", "washer", [0, 0, 0], undefined, 1.15),
      part("p1", "hex_nut", [0, 0, 0], { instanceId: "p0", socketId: "center", ownSocketId: "center" }),
      part("p2", "metal_rod", [105, 0, 0], { instanceId: "p0", socketId: "center", ownSocketId: "center" }),
      part("p3", "bolt", [165, 0, 0], { instanceId: "p2", socketId: "center", ownSocketId: "center" }),
    ]),
  },
  {
    id: "instrument",
    label: "楽器（クラリネット風）",
    expectedTier: "detailed",
    rationale: "クラリネットのボルタ(+750円)を代表アンカーにする",
    document: doc("楽器（クラリネット風）", chain([
      { id: "i0", type: "metal_rod", position: [-70, 0, 0] },
      { id: "i1", type: "hex_nut", position: [-30, 0, 0] },
      { id: "i2", type: "washer", position: [5, 0, 0] },
      { id: "i3", type: "hex_nut", position: [38, 0, 0] },
      { id: "i4", type: "washer", position: [72, 0, 0] },
      { id: "i5", type: "bolt", position: [110, 0, 0] },
      { id: "i6", type: "wire", position: [30, 45, 10] },
      { id: "i7", type: "led_yellow", position: [70, 45, 10] },
    ])),
  },
  {
    id: "yakitori",
    label: "やきとり風",
    expectedTier: "complex",
    rationale: "やきとりボルタ(+1,050円)を代表アンカーにする",
    document: doc("やきとり風", chain([
      { id: "y0", type: "metal_rod", position: [-90, 0, 0] },
      { id: "y1", type: "hex_nut", position: [-55, 0, 0] },
      { id: "y2", type: "washer", position: [-20, 0, 0] },
      { id: "y3", type: "hex_nut", position: [15, 0, 0] },
      { id: "y4", type: "washer", position: [50, 0, 0] },
      { id: "y5", type: "hex_nut", position: [85, 0, 0] },
      { id: "y6", type: "wire", position: [20, 50, 18] },
      { id: "y7", type: "spring", position: [55, 50, -18] },
      { id: "y8", type: "led_red", position: [90, 48, 18] },
      { id: "y9", type: "bolt", position: [125, 10, 0] },
      { id: "y10", type: "washer", position: [145, 10, 0] },
      { id: "y11", type: "wire", position: [40, -45, -18] },
    ])),
  },
  {
    id: "machine",
    label: "複雑な機械風",
    expectedTier: "complex",
    rationale: "多部品・多接続・特殊部品が多いが、バイクほど大型ではない",
    document: doc("複雑な機械風", chain([
      { id: "m0", type: "bolt", position: [-120, -40, -25] },
      { id: "m1", type: "hex_nut", position: [-80, -40, -25] },
      { id: "m2", type: "washer", position: [-40, -40, -25] },
      { id: "m3", type: "metal_rod", position: [0, -40, -25] },
      { id: "m4", type: "spring", position: [45, -40, -25] },
      { id: "m5", type: "wire", position: [90, -20, -10] },
      { id: "m6", type: "led_green", position: [110, 25, 10] },
      { id: "m7", type: "hex_nut", position: [65, 45, 25] },
      { id: "m8", type: "washer", position: [20, 45, 25] },
      { id: "m9", type: "bolt", position: [-25, 45, 25] },
      { id: "m10", type: "spring", position: [-70, 35, 10] },
      { id: "m11", type: "wire", position: [-115, 10, -10] },
      { id: "m12", type: "led_red", position: [-80, -15, 15] },
      { id: "m13", type: "metal_rod", position: [0, 10, 35] },
    ])),
  },
  {
    id: "bike",
    label: "バイク風",
    expectedTier: "large",
    rationale: "ライダーボルタ(+2,250円)を大型構造アンカーにする",
    document: doc("バイク風", chain([
      { id: "b0", type: "washer", position: [-150, 70, -35], scale: 1.3 },
      { id: "b1", type: "hex_nut", position: [-150, 70, -35] },
      { id: "b2", type: "metal_rod", position: [-95, 20, -20] },
      { id: "b3", type: "bolt", position: [-40, -20, -10] },
      { id: "b4", type: "metal_rod", position: [20, -25, 0] },
      { id: "b5", type: "spring", position: [65, -5, 10] },
      { id: "b6", type: "washer", position: [135, 70, 35], scale: 1.3 },
      { id: "b7", type: "hex_nut", position: [135, 70, 35] },
      { id: "b8", type: "metal_rod", position: [90, 15, 20] },
      { id: "b9", type: "bolt", position: [45, 40, 10] },
      { id: "b10", type: "wire", position: [0, 80, 25] },
      { id: "b11", type: "led_red", position: [80, -55, 0] },
      { id: "b12", type: "led_yellow", position: [-80, -55, 0] },
      { id: "b13", type: "metal_rod", position: [0, -80, -30] },
      { id: "b14", type: "hex_nut", position: [0, 0, 30] },
      { id: "b15", type: "washer", position: [0, 0, -30] },
    ])),
  },
  {
    id: "long-simple",
    label: "大きいけど単純",
    expectedTier: "standard",
    rationale: "単一方向に長いだけでは大型・機械構造にしない",
    document: doc("大きいけど単純", [
      part("s0", "metal_rod", [-280, 0, 0]),
      part("s1", "metal_rod", [-140, 0, 0], { instanceId: "s0", socketId: "center", ownSocketId: "center" }),
      part("s2", "metal_rod", [0, 0, 0], { instanceId: "s1", socketId: "center", ownSocketId: "center" }),
      part("s3", "metal_rod", [140, 0, 0], { instanceId: "s2", socketId: "center", ownSocketId: "center" }),
      part("s4", "metal_rod", [280, 0, 0], { instanceId: "s3", socketId: "center", ownSocketId: "center" }),
    ]),
  },
]

const summary = []
for (const fixture of cases) {
  const result = pricing.estimateCustomItemPrice(fixture.document)
  assert.equal(result.tier, fixture.expectedTier, `${fixture.label}: expected ${fixture.expectedTier}, got ${result.tier}`)
  summary.push({
    id: fixture.id,
    label: fixture.label,
    expectedTier: fixture.expectedTier,
    score: result.score,
    surcharge: result.surcharge,
    partCount: result.features.partCount,
    connectionCount: result.features.connectionCount,
    sizeRatio: result.features.sizeRatio,
    spreadRatio: result.features.spreadRatio,
    largeStructure: result.largeStructure,
    rationale: fixture.rationale,
  })
}

const fishing = summary.find((entry) => entry.id === "fishing-rod")
const bike = summary.find((entry) => entry.id === "bike")
const longSimple = summary.find((entry) => entry.id === "long-simple")
assert.equal(fishing.largeStructure, false, "long fishing rod must not be promoted by one-axis length")
assert.equal(bike.largeStructure, true, "bike-like structure should promote to large tier")
assert.equal(longSimple.largeStructure, false, "one-axis long/simple structure should stay out of large tier")
assert.ok(longSimple.sizeRatio > 1.55 && longSimple.spreadRatio < 0.2, "adversarial case must exercise max-size vs spread distinction")

console.table(summary.map(({ rationale, ...entry }) => entry))
console.log(`Price calibration: ${summary.length} representative cases PASS`)
