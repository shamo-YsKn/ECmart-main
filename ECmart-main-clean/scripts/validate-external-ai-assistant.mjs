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

const shared = load("lib/robot-idea-external-shared.ts")
const robotConfig = load("lib/robot-config.ts")
const pricing = load("lib/price-estimator.ts")
let checks = 0
const check = async (name, fn) => { await fn(); checks += 1; console.log(`PASS ${name}`) }

const context = {
  currentConfig: robotConfig.DEFAULT_ROBOT_CONFIG,
  availableItems: ["none", "flower"],
  availableBodyColors: [
    { label: "しんちゅう", value: "#c9a24b" },
    { label: "あおがね", value: "#5b8c9c" },
  ],
  availableAccentColors: [{ label: "黒", value: "#111111" }],
}

const raw = {
  candidates: [
    { title: "釣りボルタ", summary: "釣竿を持つ案", themeLabel: "釣り", base: "volta", pose: "point", item: "none", view: "front", bodyColor: "#c9a24b", accentColor: "#111111", customItemHint: "釣竿", reasons: ["釣りの希望を優先"] },
    { title: "青いナッティ", summary: "海辺で手を振る案", themeLabel: "海", base: "natty", pose: "wave", item: "flower", view: "side-right", bodyColor: "#5b8c9c", accentColor: "#111111", customItemHint: "", reasons: ["色指定を反映"] },
    { title: "安全な比較案", summary: "シンプルな案", themeLabel: "比較", base: "volta", pose: "stand", item: "none", view: "back", bodyColor: "#c9a24b", accentColor: "#111111", customItemHint: "", reasons: ["比較しやすくする"] },
  ],
}

await check("structured payload parses", () => {
  const drafts = shared.parseExternalRobotIdeaDrafts(raw)
  assert.equal(drafts?.length, 3)
})

await check("external result builds exactly three safe candidates", () => {
  const drafts = shared.parseExternalRobotIdeaDrafts(raw)
  const result = shared.buildExternalRobotIdeaResult("釣りをしたい", drafts, context, "gemini-test")
  assert.equal(result.providerUsed, "gemini")
  assert.equal(result.candidates.length, 3)
  assert.equal(result.candidates[0].customItemProposal?.templateId, "fishing-rod")
  assert.equal(pricing.estimateCustomItemPrice(result.candidates[0].customItemProposal.document).tier, "standard")
})

await check("invalid enum is rejected", () => {
  const broken = structuredClone(raw)
  broken.candidates[0].pose = "flying"
  assert.equal(shared.parseExternalRobotIdeaDrafts(broken), null)
})

await check("unavailable color and built-in item are sanitized", () => {
  const modified = structuredClone(raw)
  modified.candidates[0].item = "wrench"
  modified.candidates[0].bodyColor = "#ffffff"
  const drafts = shared.parseExternalRobotIdeaDrafts(modified)
  const result = shared.buildExternalRobotIdeaResult("工具", drafts, context, "gemini-test")
  assert.equal(result.candidates[0].config.item, "none")
  assert.equal(result.candidates[0].config.bodyColor, robotConfig.DEFAULT_ROBOT_CONFIG.bodyColor)
})

await check("API route keeps key server-side and adds guardrails", () => {
  const source = fs.readFileSync("app/api/idea-assistant/route.ts", "utf8")
  assert.match(source, /sameOrigin/)
  assert.match(source, /takeRateLimitSlot/)
  assert.match(source, /sanitizeContext/)
  assert.ok(!source.includes("NEXT_PUBLIC_GEMINI"))
})

await check("Gemini server uses structured JSON and header auth", () => {
  const source = fs.readFileSync("lib/robot-idea-external-server.ts", "utf8")
  assert.match(source, /gemini-3\.1-flash-lite/)
  assert.match(source, /x-goog-api-key/)
  assert.match(source, /responseMimeType:\s*"application\/json"/)
  assert.match(source, /responseSchema/)
  assert.match(source, /AbortController/)
  assert.match(source, /429/)
  assert.ok(!source.includes("?key="))
})

await check("client calls same-origin API only when AI is enabled", () => {
  const source = fs.readFileSync("components/robot/robot-idea-assistant.tsx", "utf8")
  assert.match(source, /fetch\("\/api\/idea-assistant"/)
  assert.match(source, /if \(!aiEnabled\)/)
  assert.match(source, /providerUsed === "gemini"/)
  assert.match(source, /製品改善/)
})

await check("environment example never exposes Gemini key publicly", () => {
  const source = fs.readFileSync(".env.example", "utf8")
  assert.match(source, /GEMINI_API_KEY/)
  assert.ok(!source.includes("NEXT_PUBLIC_GEMINI_API_KEY"))
})


await check("server falls back with no API key", async () => {
  const server = load("lib/robot-idea-external-server.ts")
  const previous = process.env.GEMINI_API_KEY
  delete process.env.GEMINI_API_KEY
  const result = await server.suggestRobotIdeasWithExternalAI("釣りをするボルタ", context)
  assert.equal(result.providerUsed, "rules")
  assert.equal(result.externalProviderConfigured, false)
  assert.match(result.fallbackReason, /APIキー/)
  if (previous) process.env.GEMINI_API_KEY = previous
})

await check("mock Gemini response reaches external provider path", async () => {
  const server = load("lib/robot-idea-external-server.ts")
  const previousKey = process.env.GEMINI_API_KEY
  const previousFetch = globalThis.fetch
  process.env.GEMINI_API_KEY = "test-only-key"
  let captured = null
  globalThis.fetch = async (url, init) => {
    captured = { url: String(url), init }
    return {
      ok: true,
      status: 200,
      async json() {
        return { candidates: [{ content: { parts: [{ text: JSON.stringify(raw) }] } }] }
      },
    }
  }
  try {
    const result = await server.suggestRobotIdeasWithExternalAI("釣りをするボルタ", context)
    assert.equal(result.providerUsed, "gemini")
    assert.equal(result.externalProviderConfigured, true)
    assert.equal(result.candidates.length, 3)
    assert.match(captured.url, /gemini-3\.1-flash-lite/)
    assert.equal(captured.init.headers["x-goog-api-key"], "test-only-key")
  } finally {
    globalThis.fetch = previousFetch
    if (previousKey) process.env.GEMINI_API_KEY = previousKey
    else delete process.env.GEMINI_API_KEY
  }
})

console.log(`External AI assistant: ${checks} checks PASS`)
