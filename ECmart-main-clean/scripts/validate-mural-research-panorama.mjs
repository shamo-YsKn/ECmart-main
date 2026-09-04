import fs from "node:fs"
import ts from "/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"

const failures = []
const check = (condition, message) => { if (!condition) failures.push(message) }
const read = (file) => fs.readFileSync(file, "utf8")

const background = read("components/mural/mural-background.tsx")
const spots = read("lib/mural-spots.ts")

check(background.includes('spot.theme === "university-tech"'), "university-tech background missing")
check(background.includes("MECHANICAL / ROBOTICS"), "robotics zone missing")
check(background.includes("ARCHITECTURE"), "architecture zone missing")
check(background.includes("CHEMICAL SCIENCE"), "chemical zone missing")
check(background.includes("白鳥大橋"), "Muroran bridge reference comment missing")
check(background.includes("時計塔"), "campus clock tower reference missing")
check(spots.includes("工学がつながる、室工大研究パノラマ"), "research mural title not updated")
check(spots.includes('{ xMin: 4, xMax: 31, centerY: 69 }'), "left placement zone missing")
check(spots.includes('{ xMin: 34, xMax: 66, centerY: 69 }'), "center placement zone missing")
check(spots.includes('{ xMin: 69, xMax: 96, centerY: 69 }'), "right placement zone missing")

for (const file of ["components/mural/mural-background.tsx", "lib/mural-spots.ts"]) {
  const source = read(file)
  const compilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    ...(file.endsWith(".tsx") ? { jsx: ts.JsxEmit.ReactJSX } : {}),
  }
  const result = ts.transpileModule(source, { compilerOptions, fileName: file, reportDiagnostics: true })
  for (const d of result.diagnostics ?? []) {
    failures.push(`${file}: ${ts.flattenDiagnosticMessageText(d.messageText, "\\n")}`)
  }
}

if (failures.length) {
  console.error("MURAL_RESEARCH_PANORAMA_VALIDATE_FAILED")
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}
console.log("MURAL_RESEARCH_PANORAMA_VALIDATE_OK")
