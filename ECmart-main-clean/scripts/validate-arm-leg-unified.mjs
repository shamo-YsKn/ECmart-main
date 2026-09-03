import fs from "node:fs"

function text(path) { return fs.readFileSync(path, "utf8") }
function requireText(path, needle, label) {
  if (!text(path).includes(needle)) throw new Error(`${label}: ${needle}`)
}
function forbidText(path, needle, label) {
  if (text(path).includes(needle)) throw new Error(`${label}: ${needle}`)
}

requireText("lib/robot-pose-2d.ts", 'const horizontal = axis === "front" ? vector.x : vector.y', "arm/leg direct orthogonal projection")
requireText("lib/robot-pose-2d.ts", 'y: origin.y - vector.z', "shared Z projection")
forbidText("lib/robot-pose-2d.ts", "projectedHorizontalFromSpatial", "arm-only display projection removed")
forbidText("components/robot/robot-pose-editor.tsx", "armPlanarVector", "arm-only planar updater removed")
forbidText("components/robot/robot-pose-editor.tsx", "seededArmSpatial", "arm-only spatial seed removed")
forbidText("components/robot/robot-pose-editor.tsx", "if (isArmHandle(handle))", "arm-only update branch removed")
requireText("components/robot/robot-pose-editor.tsx", "腕・脚を同じ疑似3Dモデルで扱う", "unified limb update exists")
requireText("components/robot/robot-pose-editor.tsx", "previousVector?.y ?? targetHorizontal", "front preserves Y")
requireText("components/robot/robot-pose-editor.tsx", "previousVector?.x ?? targetHorizontal", "side preserves X")
requireText("components/robot/robot-pose-editor.tsx", "projectedLength < 6", "collapsed projection recovery exists")
requireText("components/robot/robot-pose-editor.tsx", "pointerDistance < 5", "pointer jump guard exists")
requireText("components/robot/robot-pose-editor.tsx", "defaultInteractionLength", "collapsed interaction radius recovery exists")
console.log("ARM_LEG_UNIFIED_VALIDATE_OK")
