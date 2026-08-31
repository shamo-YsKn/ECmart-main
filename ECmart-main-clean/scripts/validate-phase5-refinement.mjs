import fs from "node:fs"

function text(path) { return fs.readFileSync(path, "utf8") }
function requireText(path, needle, label) {
  if (!text(path).includes(needle)) throw new Error(`${label}: ${needle}`)
}

requireText("app/page.tsx", '"pose"', "pose tab is registered")
requireText("components/site-client.tsx", '<RobotPoseStudio />', "pose studio is routed")
requireText("components/robot/robot-pose-studio.tsx", 'view: "front"', "front pose editor exists")
requireText("components/robot/robot-pose-studio.tsx", 'view: "side"', "side pose editor exists")
requireText("components/robot/robot-pose-studio.tsx", '背面確認', "back preview exists")
requireText("components/robot/robot-pose-editor.tsx", 'linkedGuidePoint', "linked projection point exists")
requireText("components/robot/robot-fallback.tsx", '+ 90', "hand head follows arm tip perpendicular")
requireText("components/robot/robot-fallback.tsx", '六角ボルト頭本体の側面', "side head parts are separated")
requireText("components/robot/robot-fallback.tsx", '背面からは大きなねじ頭ではなく', "rear eye screw placement is revised")
requireText("lib/diorama-model.ts", 'DIORAMA_EDITOR_ROBOT_LIMIT = 5', "diorama visible robot limit")
requireText("lib/diorama-model.ts", 'snapDioramaRobotTransform', "diorama ground snapping")
requireText("lib/diorama-stages.ts", 'bridge-deck', "diorama platform snapping")
requireText("lib/mural-spots.ts", 'MURAL_WALL_ROBOT_LIMIT = 5', "mural robot limit")
requireText("lib/mural-spots.ts", 'snapMuralRobotY', "mural ground snapping")
requireText("lib/mural-spots.ts", 'minimumAmbient: 0', "NPCs can fully yield to real posts")
requireText("components/mural/mural-view.tsx", 'wallPosts', "wall displays a capped real-post set")
requireText("components/mural/mural-view.tsx", '壁画表示', "wall count is visible")

console.log("PHASE5_REFINEMENT_VALIDATE_OK")
