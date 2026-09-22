import fs from "node:fs"
import ts from "typescript"

const source = fs.readFileSync("lib/robot-pose-2d.ts", "utf8")
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
  fileName: "lib/robot-pose-2d.ts",
  reportDiagnostics: true,
})
if (compiled.diagnostics?.length) {
  for (const d of compiled.diagnostics) {
    console.error(ts.flattenDiagnosticMessageText(d.messageText, "\n"))
  }
  process.exit(1)
}

const mod = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`)
const { buildRobot2DLayout, updatePoseAxisLinked, normalizePoseState } = mod

function approx(actual, expected, label, eps = 1e-6) {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`)
  }
}
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

const poseState = {
  mode: "custom",
  preset: "stand",
  joints: {},
  axes: { front: {}, side: {} },
  spatial: {
    leftUpperLeg: { x: 0, y: 38, z: 0 },
    leftLowerLeg: { x: 0, y: 45, z: 0 },
    leftUpperArm: { x: 0, y: 40, z: 0 },
    leftLowerArm: { x: 0, y: 40, z: 0 },
  },
}
const base = { base: "volta", size: 50, pose: "stand", poseState }
const front = buildRobot2DLayout({ ...base, view: "front" })
const side = buildRobot2DLayout({ ...base, view: "side" })

// 奥行き方向を向く部材は正面で一点近く、側面では本来の前後長で見える。
approx(distance(front.hips.left, front.knees.left), 0, "front upper leg collapse")
approx(distance(side.hips.left, side.knees.left), 38, "side upper leg projection")
approx(distance(front.shoulders.left, front.elbows.left), 0, "front upper arm collapse")
approx(distance(side.shoulders.left, side.elbows.left), 40, "side upper arm projection")

// 親子リンク: 子リンクは移動した親関節を起点に積み上がる。
const chainState = {
  ...poseState,
  spatial: {
    ...poseState.spatial,
    rightUpperLeg: { x: 10, y: 20, z: 5 },
    rightLowerLeg: { x: 3, y: 4, z: -2 },
    rightUpperArm: { x: 7, y: 11, z: 6 },
    rightLowerArm: { x: -2, y: 5, z: -3 },
  },
}
const chainFront = buildRobot2DLayout({ ...base, poseState: chainState, view: "front" })
approx(chainFront.knees.right.x - chainFront.hips.right.x, 10, "upper leg X")
approx(chainFront.knees.right.y - chainFront.hips.right.y, -5, "upper leg Z")
approx(chainFront.feet.right.x - chainFront.knees.right.x, 3, "lower leg X from knee")
approx(chainFront.feet.right.y - chainFront.knees.right.y, 2, "lower leg Z from knee")
approx(chainFront.elbows.right.x - chainFront.shoulders.right.x, 7, "upper arm X")
approx(chainFront.elbows.right.y - chainFront.shoulders.right.y, -6, "upper arm Z")
approx(chainFront.hands.right.x - chainFront.elbows.right.x, -2, "lower arm X from elbow")
approx(chainFront.hands.right.y - chainFront.elbows.right.y, 3, "lower arm Z from elbow")

// spatialPatchを使う更新では、反対ビューの角度を勝手に書き換えず、XYZを共有する。
const linkedInput = normalizePoseState("stand", {
  mode: "custom", preset: "stand", joints: { leftHip: 100 },
  axes: { front: { leftHip: 100 }, side: { leftHip: 93 } }, spatial: {},
})
const linked = updatePoseAxisLinked(
  linkedInput,
  "front",
  { leftHip: 110 },
  { leftUpperLeg: { x: 20, y: 31, z: 12 } },
)
if (linked.axes?.side?.leftHip !== 93) throw new Error("side angle changed during front spatial update")
if (linked.spatial?.leftUpperLeg?.x !== 20 || linked.spatial?.leftUpperLeg?.y !== 31 || linked.spatial?.leftUpperLeg?.z !== 12) {
  throw new Error("spatial vector was not stored correctly")
}

console.log("POSE_RUNTIME_VALIDATE_OK")
