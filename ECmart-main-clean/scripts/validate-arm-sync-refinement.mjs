import fs from "node:fs"

function text(path) { return fs.readFileSync(path, "utf8") }
function requireText(path, needle, label) {
  if (!text(path).includes(needle)) throw new Error(`${label}: ${needle}`)
}
function forbidText(path, needle, label) {
  if (text(path).includes(needle)) throw new Error(`${label}: ${needle}`)
}

// 現在の最終仕様: 腕も脚と同じXYZ更新・XZ/YZ直交投影を使う。
requireText("lib/robot-pose-2d.ts", 'left: { x: 147, y: 104 }', "side shoulder Z aligned")
requireText("lib/robot-pose-2d.ts", 'right: { x: 158, y: 104 }', "near shoulder Z aligned")
requireText("lib/robot-pose-2d.ts", 'const horizontal = axis === "front" ? vector.x : vector.y', "direct XZ/YZ projection")
requireText("components/robot/robot-pose-editor.tsx", 'previousVector?.y ?? targetHorizontal', "front preserves Y")
requireText("components/robot/robot-pose-editor.tsx", 'previousVector?.x ?? targetHorizontal', "side preserves X")
requireText("components/robot/robot-pose-editor.tsx", 'projectedLength < 6', "collapsed projection recovery")
requireText("components/robot/robot-pose-editor.tsx", 'svgRef.current?.setPointerCapture', "root SVG pointer capture exists")
requireText("components/robot/robot-pose-editor.tsx", 'onPointerMove={moveDrag}', "root SVG handles pointer move")
forbidText("components/robot/robot-pose-editor.tsx", "seededArmSpatial", "legacy arm-only spatial seed removed")
forbidText("components/robot/robot-pose-editor.tsx", "armPlanarVector", "legacy arm-only planar update removed")
forbidText("lib/robot-pose-2d.ts", "projectedHorizontalFromSpatial", "legacy arm-only projection removed")

console.log("ARM_SYNC_REFINEMENT_VALIDATE_OK")
