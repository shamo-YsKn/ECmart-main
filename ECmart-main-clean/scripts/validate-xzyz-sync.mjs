import fs from "node:fs"

function text(path) { return fs.readFileSync(path, "utf8") }
function requireText(path, needle, label) {
  if (!text(path).includes(needle)) throw new Error(`${label}: ${needle}`)
}

requireText("lib/types.ts", "RobotPoseSpatial", "spatial pose type exists")
requireText("lib/types.ts", "z: number", "shared Z coordinate exists")
requireText("lib/robot-pose-2d.ts", "axis === \"front\" ? vector.x : vector.y", "front and side use independent horizontal coordinates")
requireText("lib/robot-pose-2d.ts", "y: origin.y - vector.z", "both projections share Z")
requireText("components/robot/robot-pose-editor.tsx", "previousVector?.y ?? targetHorizontal", "front edits preserve side Y")
requireText("components/robot/robot-pose-editor.tsx", "previousVector?.x ?? targetHorizontal", "side edits preserve front X")
requireText("components/robot/robot-pose-studio.tsx", "XZ平面", "front XZ explanation exists")
requireText("components/robot/robot-pose-studio.tsx", "YZ平面", "side YZ explanation exists")
console.log("XZYZ_SYNC_VALIDATE_OK")
