import fs from "node:fs"

function text(path) { return fs.readFileSync(path, "utf8") }
function requireText(path, needle, label) {
  if (!text(path).includes(needle)) throw new Error(`${label}: ${needle}`)
}

requireText("components/robot/robot-workshop.tsx", 'url.searchParams.set("tab", "pose")', "pose studio uses URL navigation")
requireText("components/robot/robot-workshop.tsx", 'window.location.assign(url.toString())', "pose studio navigation reload fallback")
requireText("lib/robot-pose-studio.ts", "saveRobotPoseStudioDraft", "pose draft storage helper")
requireText("lib/robot-pose-studio.ts", "window.localStorage", "pose draft storage fallback")
requireText("components/robot/robot-pose-studio.tsx", 'url.searchParams.set("tab", "robot")', "pose studio return navigation")
requireText("components/robot/robot-fallback.tsx", 'const perpendicular = side === "left" ? -90 : 90', "right hand orientation is mirrored")

console.log("POSE_HOTFIX_VALIDATE_OK")
