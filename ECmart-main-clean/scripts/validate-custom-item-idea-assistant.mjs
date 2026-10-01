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
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: file,
  })
  const resolve = name => name.startsWith("@/") ? load(name.slice(2)) : name.startsWith(".") ? load(path.resolve(path.dirname(file), name)) : require(name)
  new Function("require", "module", "exports", outputText)(resolve, module, module.exports)
  return module.exports
}

const itemIdeas = load("lib/custom-item-idea-engine.ts")
const robotIdeas = load("lib/robot-idea-engine.ts")
const pricing = load("lib/price-estimator.ts")
const robotConfig = load("lib/robot-config.ts")
let checks = 0
const check = (name, fn) => { fn(); checks += 1; console.log(`PASS ${name}`) }

const cases = [
  ["釣竿", "fishing-rod", "standard"],
  ["ギター", "guitar", "detailed"],
  ["クラリネット", "clarinet", "detailed"],
  ["室蘭やきとり", "yakitori", "complex"],
  ["バイク", "bike", "large"],
  ["カメラ", "camera", "standard"],
  ["望遠鏡", "telescope", "standard"],
  ["フライパン", "frying-pan", "standard"],
]
for (const [query, templateId, tier] of cases) {
  check(`${query} -> ${templateId}/${tier}`, () => {
    const result = itemIdeas.suggestCustomItemIdea(query)
    assert.ok(result)
    assert.equal(result.templateId, templateId)
    assert.ok(result.document.parts.length > 0)
    assert.equal(pricing.estimateCustomItemPrice(result.document).tier, tier)
  })
}

check("unknown item does not hallucinate parts", () => {
  assert.equal(itemIdeas.suggestCustomItemIdea("量子雲を手に持つ謎の装置"), null)
})
check("generator contains no network call or API endpoint", () => {
  const source = fs.readFileSync("lib/custom-item-idea-engine.ts", "utf8")
  assert.ok(!source.includes("fetch("))
  assert.ok(!/https?:\/\//.test(source))
})
check("idea candidates expose workbench proposal", () => {
  const result = robotIdeas.suggestRobotIdeas("ギターを演奏するナッティ", {
    currentConfig: robotConfig.DEFAULT_ROBOT_CONFIG,
    availableItems: ["none", "wrench", "flower", "gear", "heart"],
    availableBodyColors: [{ label: "しんちゅう", value: "#c9a24b" }],
    availableAccentColors: [{ label: "黒", value: "#111111" }],
  })
  assert.equal(result.candidates[0].customItemProposal?.templateId, "guitar")
  assert.equal(pricing.estimateCustomItemPrice(result.candidates[0].customItemProposal.document).tier, "detailed")
})
check("desktop assistant stages proposal into workbench", () => {
  const source = fs.readFileSync("components/robot/robot-idea-assistant.tsx", "utf8")
  assert.match(source, /CUSTOM_ITEM_DRAFT_KEY/)
  assert.match(source, /工作台へ読み込む/)
  assert.match(source, /idea-assistant-workbench/)
})
check("workbench recognizes idea source", () => {
  const source = fs.readFileSync("components/workbench/custom-item-workshop.tsx", "utf8")
  assert.match(source, /文章から提案した部品構成/)
})
check("mobile shows proposal without pretending to support drag editor", () => {
  const source = fs.readFileSync("components/mobile/mobile-site.tsx", "utf8")
  assert.match(source, /工作案：/)
  assert.match(source, /自動読み込みはPC版/)
})

console.log(`Custom item idea assistant: ${checks} checks PASS`)
