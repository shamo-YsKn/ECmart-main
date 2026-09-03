import fs from "node:fs"

function text(path) { return fs.readFileSync(path, "utf8") }
function requireText(path, needle, label) {
  if (!text(path).includes(needle)) throw new Error(`${label}: ${needle}`)
}

requireText("lib/robot-pose-2d.ts", 'left: { x: 147, y: 104 }', "side shoulder Z aligned")
requireText("lib/robot-pose-2d.ts", 'right: { x: 158, y: 104 }', "near shoulder Z aligned")
requireText("components/robot/robot-pose-editor.tsx", 'function seededArmSpatial', "arm spatial seed exists")
requireText("components/robot/robot-pose-editor.tsx", 'y: 0,', "arm default depth is neutral")
requireText("components/robot/robot-pose-editor.tsx", 'function armPlanarVector', "arm XZ/YZ planar update exists")
requireText("components/robot/robot-pose-editor.tsx", 'y: previous.y', "front preserves Y")
requireText("components/robot/robot-pose-editor.tsx", 'x: previous.x', "side preserves X")
requireText("components/robot/robot-pose-editor.tsx", 'svgRef.current?.setPointerCapture', "root SVG pointer capture exists")
requireText("components/robot/robot-pose-editor.tsx", 'onPointerMove={moveDrag}', "root SVG handles pointer move")
console.log("ARM_SYNC_REFINEMENT_VALIDATE_OK")
