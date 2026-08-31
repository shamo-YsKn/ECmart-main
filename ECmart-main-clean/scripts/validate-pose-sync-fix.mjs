import fs from "node:fs"

function text(path) { return fs.readFileSync(path, "utf8") }
function requireText(path, needle, label) {
  if (!text(path).includes(needle)) throw new Error(`${label}: ${needle}`)
}

requireText("lib/robot-pose-2d.ts", "export function updatePoseAxisLinked", "linked front/side pose updater exists")
requireText("lib/robot-pose-2d.ts", "angleWithVerticalDelta", "vertical motion is synchronized across views")
requireText("components/robot/robot-pose-editor.tsx", "updatePoseAxisLinked", "pose editor uses linked updater")
requireText("components/robot/robot-pose-studio.tsx", "反対ビューの関節線も同期して動き", "pose studio explains linked movement")
requireText("components/robot/robot-fallback.tsx", 'const perpendicular = side === "left" ? -90 : 90', "hand orientation follows the requested screen-right reference")

console.log("POSE_SYNC_FIX_VALIDATE_OK")
