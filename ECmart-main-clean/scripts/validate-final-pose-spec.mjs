import fs from "node:fs"
import ts from "typescript"

const failures = []
const read = (file) => fs.readFileSync(file, "utf8")
const requireText = (file, needle, label) => {
  if (!read(file).includes(needle)) failures.push(`${label}: missing ${needle}`)
}
const forbidText = (file, needle, label) => {
  if (read(file).includes(needle)) failures.push(`${label}: forbidden ${needle}`)
}

// 1) 最終仕様の構造チェック
forbidText("components/robot/robot-pose-editor.tsx", "if (isArmHandle(handle))", "arm-only branch must stay removed")
forbidText("components/robot/robot-pose-editor.tsx", "armPlanarVector", "arm-only fixed-radius updater must stay removed")
forbidText("components/robot/robot-pose-editor.tsx", "seededArmSpatial", "arm-only spatial seeding must stay removed")
forbidText("lib/robot-pose-2d.ts", "projectedHorizontalFromSpatial", "arm-only display projection must stay removed")
forbidText("lib/robot-pose-2d.ts", "armProjectionLimit", "arm-only projection limit must stay removed")

requireText("components/robot/robot-pose-editor.tsx", "腕・脚を同じ疑似3Dモデルで扱う", "unified arm/leg spatial update")
requireText("components/robot/robot-pose-editor.tsx", "previousVector?.y ?? targetHorizontal", "front edit preserves Y")
requireText("components/robot/robot-pose-editor.tsx", "previousVector?.x ?? targetHorizontal", "side edit preserves X")
requireText("components/robot/robot-pose-editor.tsx", "projectedLength < 6", "collapsed projection detection")
requireText("components/robot/robot-pose-editor.tsx", "pointerDistance < 5", "collapsed projection pointer guard")
requireText("components/robot/robot-pose-editor.tsx", "defaultInteractionLength", "interaction radius fallback")
requireText("components/robot/robot-pose-editor.tsx", "setPointerCapture", "stable pointer capture")
requireText("components/robot/robot-pose-editor.tsx", "実際にドラッグが始まってから更新", "no pointer-down jump")

requireText("lib/robot-pose-2d.ts", 'const horizontal = axis === "front" ? vector.x : vector.y', "direct XZ/YZ orthographic projection")
requireText("lib/robot-pose-2d.ts", "y: origin.y - vector.z", "shared Z projection")
requireText("lib/robot-pose-2d.ts", 'left: pointFromSpatialOrAngle(shouldersAxis.left, spatial, "leftUpperArm"', "upper arm uses common spatial renderer")
requireText("lib/robot-pose-2d.ts", 'left: pointFromSpatialOrAngle(elbowsAxis.left, spatial, "leftLowerArm"', "lower arm follows elbow parent")
requireText("lib/robot-pose-2d.ts", 'left: pointFromSpatialOrAngle(hipsAxis.left, spatial, "leftUpperLeg"', "upper leg uses common spatial renderer")
requireText("lib/robot-pose-2d.ts", 'left: pointFromSpatialOrAngle(kneesAxis.left, spatial, "leftLowerLeg"', "lower leg follows knee parent")

// 2) 変更対象TS/TSXの構文チェック
for (const file of [
  "components/robot/robot-pose-editor.tsx",
  "components/robot/robot-pose-studio.tsx",
  "components/robot/robot-fallback.tsx",
  "lib/robot-pose-2d.ts",
  "lib/types.ts",
]) {
  const isTsx = file.endsWith(".tsx")
  const result = ts.transpileModule(read(file), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      ...(isTsx ? { jsx: ts.JsxEmit.ReactJSX } : {}),
    },
    fileName: file,
    reportDiagnostics: true,
  })
  for (const diagnostic of result.diagnostics ?? []) {
    failures.push(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`)
  }
}

// 3) 仕様そのものの数値サニティチェック
function project(vector, axis) {
  return axis === "front" ? [vector.x, vector.z] : [vector.y, vector.z]
}
const sample = { x: 5, y: 35, z: -10 }
const front = project(sample, "front")
const side = project(sample, "side")
if (front[0] !== 5 || front[1] !== -10) failures.push("front projection must be XZ")
if (side[0] !== 35 || side[1] !== -10) failures.push("side projection must be YZ")

const before = { x: 8, y: 31, z: -6 }
const frontEdited = { x: 20, y: before.y, z: 12 }
const sideEdited = { x: before.x, y: -24, z: 4 }
if (frontEdited.y !== before.y) failures.push("front edit must preserve Y")
if (sideEdited.x !== before.x) failures.push("side edit must preserve X")

if (failures.length) {
  console.error("FINAL_POSE_SPEC_VALIDATE_FAILED")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log("FINAL_POSE_SPEC_VALIDATE_OK")
