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
  const resolve = (name) => name.startsWith("@/")
    ? load(name.slice(2))
    : name.startsWith(".")
      ? load(path.resolve(path.dirname(file), name))
      : require(name)
  new Function("require", "module", "exports", outputText)(resolve, module, module.exports)
  return module.exports
}

const engine = load("lib/robot-idea-engine.ts")
const pricing = load("lib/price-estimator.ts")
const robotConfig = load("lib/robot-config.ts")

const allItems = ["none", "wrench", "flower", "gear", "heart"]
const allBodyColors = [
  { label: "しんちゅう", value: "#c9a24b" },
  { label: "あおがね", value: "#5b8c9c" },
]
const allAccentColors = [
  { label: "黒", value: "#111111" },
  { label: "みずいろ", value: "#5fb6d1" },
]
const baseContext = {
  currentConfig: robotConfig.DEFAULT_ROBOT_CONFIG,
  availableItems: allItems,
  availableBodyColors: allBodyColors,
  availableAccentColors: allAccentColors,
}

const fishing = engine.suggestRobotIdeas("釣りをしている楽しそうなボルタ", baseContext)
assert.equal(fishing.candidates.length, 3)
assert.equal(fishing.candidates[0].themeId, "fishing")
assert.equal(fishing.candidates[0].config.base, "volta")
assert.equal(fishing.candidates[0].futureCustomItemHint, "釣竿")
assert.equal(pricing.estimateRobotReferencePrice(fishing.candidates[0].config).total, 1150)

const natty = engine.suggestRobotIdeas("花を持って手を振るナッティ", baseContext)
assert.ok(natty.candidates.every((candidate) => candidate.config.base === "natty"))
assert.equal(natty.candidates[0].config.pose, "wave")
assert.equal(natty.candidates[0].config.item, "flower")
assert.equal(pricing.estimateRobotReferencePrice(natty.candidates[0].config).total, 1250)

const side = engine.suggestRobotIdeas("右側面から工場を案内するボルタ", baseContext)
assert.ok(side.candidates.every((candidate) => candidate.config.view === "side-right"))
assert.equal(side.candidates[0].themeId, "factory")
assert.equal(side.candidates[0].config.item, "gear")

const locked = engine.suggestRobotIdeas("スパナを持って整備するボルタ", {
  ...baseContext,
  availableItems: ["none"],
})
assert.equal(locked.candidates[0].config.item, "none")
assert.ok(locked.candidates[0].reasons.some((reason) => reason.includes("未解放")))

const blue = engine.suggestRobotIdeas("青いボディで海を眺めるボルタ", baseContext)
assert.equal(blue.candidates[0].config.bodyColor, "#5b8c9c")

const blueLocked = engine.suggestRobotIdeas("青いボディで海を眺めるボルタ", {
  ...baseContext,
  availableBodyColors: [{ label: "しんちゅう", value: "#c9a24b" }],
})
assert.equal(blueLocked.candidates[0].config.bodyColor, robotConfig.DEFAULT_ROBOT_CONFIG.bodyColor)
assert.ok(blueLocked.candidates[0].reasons.some((reason) => reason.includes("未解放")))

const music = engine.suggestRobotIdeas("ギターを演奏するナッティ", baseContext)
assert.equal(music.candidates[0].themeId, "music")
assert.equal(music.candidates[0].futureCustomItemHint, "楽器")

const externalFallback = engine.suggestRobotIdeas("室蘭らしいボルタ", { ...baseContext, requestedProvider: "external" })
assert.equal(externalFallback.requestedProvider, "external")
assert.equal(externalFallback.providerUsed, "rules")
assert.equal(externalFallback.externalProviderConfigured, false)
assert.match(externalFallback.fallbackReason ?? "", /未設定/)

const unknown = engine.suggestRobotIdeas("静かな夕暮れを感じる作品", baseContext)
assert.equal(unknown.candidates.length, 3)
for (const candidate of unknown.candidates) {
  assert.doesNotThrow(() => robotConfig.normalizeRobotConfig(candidate.config))
}

const engineSource = fs.readFileSync("lib/robot-idea-engine.ts", "utf8")
assert.ok(!engineSource.includes("fetch("), "rule engine must not make network requests")
assert.ok(!/https?:\/\//.test(engineSource), "rule engine must not contain an external API endpoint")

const desktopSource = fs.readFileSync("components/robot/robot-workshop.tsx", "utf8")
assert.match(desktopSource, /RobotIdeaAssistant/)
assert.match(desktopSource, /applyIdeaCandidate/)
const mobileSource = fs.readFileSync("components/mobile/mobile-site.tsx", "utf8")
assert.match(mobileSource, /suggestRobotIdeas/)
assert.match(mobileSource, /AI接続 OFF/)

console.log("Robot idea assistant: PASS (25 checks)")
