import type {
  RobotBase,
  RobotConfig,
  RobotJointAngles,
  RobotJointId,
  RobotPose,
  RobotPoseState,
  RobotView,
} from "@/lib/types"

export type Point = { x: number; y: number }
export type PoseAxis = "front" | "side"

export const ROBOT_2D_VIEWBOX = "0 0 300 320"
export const ROBOT_2D_CENTER: Readonly<Point> = Object.freeze({ x: 150, y: 145 })

export const ROBOT_POSE_JOINT_IDS = [
  "leftShoulder",
  "leftElbow",
  "rightShoulder",
  "rightElbow",
  "leftHip",
  "leftKnee",
  "rightHip",
  "rightKnee",
] as const satisfies readonly RobotJointId[]

export interface Robot2DLayout {
  axis: PoseAxis
  view: RobotView
  scale: number
  isNatty: boolean
  bodyTopY: number
  bodyBottomY: number
  bodyHeight: number
  shoulders: { left: Point; right: Point }
  elbows: { left: Point; right: Point }
  hands: { left: Point; right: Point }
  hips: { left: Point; right: Point }
  knees: { left: Point; right: Point }
  feet: { left: Point; right: Point }
}

const FRONT_PRESETS: Record<RobotPose, Required<RobotJointAngles>> = {
  stand: {
    leftShoulder: 124,
    leftElbow: -14,
    rightShoulder: 56,
    rightElbow: 14,
    leftHip: 100,
    leftKnee: 8,
    rightHip: 80,
    rightKnee: -8,
  },
  wave: {
    leftShoulder: 124,
    leftElbow: -14,
    rightShoulder: -38,
    rightElbow: -40,
    leftHip: 100,
    leftKnee: 8,
    rightHip: 80,
    rightKnee: -8,
  },
  cheer: {
    leftShoulder: -142,
    leftElbow: 20,
    rightShoulder: -38,
    rightElbow: 20,
    leftHip: 100,
    leftKnee: 8,
    rightHip: 80,
    rightKnee: -8,
  },
  point: {
    leftShoulder: 124,
    leftElbow: -14,
    rightShoulder: 0,
    rightElbow: -8,
    leftHip: 100,
    leftKnee: 8,
    rightHip: 80,
    rightKnee: -8,
  },
}

/**
 * 側面はユーザー共有図に合わせ、頭が左を向く表示。
 * left = 奥側、right = 手前側として少しずらして描画します。
 */
const SIDE_PRESETS: Record<RobotPose, Required<RobotJointAngles>> = {
  stand: {
    leftShoulder: 142,
    leftElbow: -5,
    rightShoulder: 137,
    rightElbow: 4,
    leftHip: 98,
    leftKnee: 2,
    rightHip: 93,
    rightKnee: 4,
  },
  wave: {
    leftShoulder: 142,
    leftElbow: -5,
    rightShoulder: -132,
    rightElbow: -12,
    leftHip: 98,
    leftKnee: 2,
    rightHip: 93,
    rightKnee: 4,
  },
  cheer: {
    leftShoulder: -138,
    leftElbow: 10,
    rightShoulder: -122,
    rightElbow: 8,
    leftHip: 98,
    leftKnee: 2,
    rightHip: 93,
    rightKnee: 4,
  },
  point: {
    leftShoulder: 142,
    leftElbow: -5,
    rightShoulder: 178,
    rightElbow: 0,
    leftHip: 98,
    leftKnee: 2,
    rightHip: 93,
    rightKnee: 4,
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeAngle(deg: number) {
  let result = deg
  while (result > 180) result -= 360
  while (result <= -180) result += 360
  return result
}

export function clampJointAngle(joint: RobotJointId, angle: number) {
  const normalized = normalizeAngle(angle)
  if (joint.includes("Shoulder") || joint.includes("Hip")) return clamp(normalized, -175, 175)
  return clamp(normalized, -160, 160)
}

function sanitizeJointAngles(value: unknown): RobotJointAngles {
  if (!isRecord(value)) return {}
  const result: RobotJointAngles = {}
  for (const jointId of ROBOT_POSE_JOINT_IDS) {
    const candidate = value[jointId]
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      result[jointId] = clampJointAngle(jointId, candidate)
    }
  }
  return result
}

export function poseAxisForView(view: RobotView): PoseAxis {
  return view === "side" ? "side" : "front"
}

export function getPresetJointAngles(pose: RobotPose, axis: PoseAxis): Required<RobotJointAngles> {
  return { ...(axis === "side" ? SIDE_PRESETS[pose] : FRONT_PRESETS[pose]) }
}

export function normalizePoseState(pose: RobotPose, value: unknown): RobotPoseState {
  if (!isRecord(value)) {
    return {
      mode: "preset",
      preset: pose,
      joints: {},
      axes: { front: {}, side: {} },
    }
  }

  const preset =
    typeof value.preset === "string" && value.preset in FRONT_PRESETS
      ? (value.preset as RobotPose)
      : pose
  const mode = value.mode === "custom" ? "custom" : "preset"
  const legacyFront = sanitizeJointAngles(value.joints)
  const axesInput = isRecord(value.axes) ? value.axes : {}
  const front = {
    ...legacyFront,
    ...sanitizeJointAngles(axesInput.front),
  }
  const side = sanitizeJointAngles(axesInput.side)

  return {
    mode,
    preset,
    joints: front,
    axes: { front, side },
  }
}

export function resolvePoseState(config: Pick<RobotConfig, "pose" | "poseState">): RobotPoseState {
  return normalizePoseState(config.pose, config.poseState)
}

export function getCustomAxisAngles(poseState: RobotPoseState, axis: PoseAxis): RobotJointAngles {
  if (axis === "front") return { ...(poseState.axes?.front ?? poseState.joints ?? {}) }
  return { ...(poseState.axes?.side ?? {}) }
}

export function resolveJointAngles(
  config: Pick<RobotConfig, "pose" | "poseState">,
  axis: PoseAxis,
): Required<RobotJointAngles> {
  const state = resolvePoseState(config)
  const preset = getPresetJointAngles(state.preset, axis)
  if (state.mode !== "custom") return preset

  const custom = getCustomAxisAngles(state, axis)
  const resolved = { ...preset, ...custom } as Required<RobotJointAngles>
  for (const jointId of ROBOT_POSE_JOINT_IDS) {
    resolved[jointId] = clampJointAngle(jointId, resolved[jointId])
  }
  return resolved
}

export function updatePoseAxis(
  state: RobotPoseState,
  axis: PoseAxis,
  nextAngles: RobotJointAngles,
): RobotPoseState {
  const normalized = normalizePoseState(state.preset, state)
  const front = axis === "front"
    ? { ...(normalized.axes?.front ?? normalized.joints), ...nextAngles }
    : { ...(normalized.axes?.front ?? normalized.joints) }
  const side = axis === "side"
    ? { ...(normalized.axes?.side ?? {}), ...nextAngles }
    : { ...(normalized.axes?.side ?? {}) }

  return {
    mode: "custom",
    preset: normalized.preset,
    joints: front,
    axes: { front, side },
  }
}

export function clearCustomPose(preset: RobotPose): RobotPoseState {
  return {
    mode: "custom",
    preset,
    joints: {},
    axes: { front: {}, side: {} },
  }
}

function pointFrom(origin: Point, absoluteAngleDeg: number, length: number): Point {
  const rad = degToRad(absoluteAngleDeg)
  return {
    x: origin.x + Math.cos(rad) * length,
    y: origin.y + Math.sin(rad) * length,
  }
}

function mirrorPoint(point: Point): Point {
  return { x: ROBOT_2D_CENTER.x * 2 - point.x, y: point.y }
}

export function pointFromAxisToView(point: Point, view: RobotView): Point {
  return view === "back" ? mirrorPoint(point) : point
}

export function pointFromViewToAxis(point: Point, view: RobotView): Point {
  return view === "back" ? mirrorPoint(point) : point
}

function mapPair(pair: { left: Point; right: Point }, view: RobotView) {
  return {
    left: pointFromAxisToView(pair.left, view),
    right: pointFromAxisToView(pair.right, view),
  }
}

export function buildRobot2DLayout(
  config: Pick<RobotConfig, "base" | "size" | "pose" | "poseState" | "view">,
): Robot2DLayout {
  const axis = poseAxisForView(config.view)
  const joints = resolveJointAngles(config, axis)
  const isNatty = config.base === "natty"
  const scale = 0.82 + ((Math.min(90, Math.max(20, config.size)) - 20) / 70) * 0.18

  const side = axis === "side"
  const bodyTopY = side ? 92 : 84
  const bodyBottomY = side ? (isNatty ? 190 : 194) : (isNatty ? 182 : 188)
  const bodyHeight = bodyBottomY - bodyTopY

  const shouldersAxis = side
    ? { left: { x: 147, y: 116 }, right: { x: 158, y: 123 } }
    : { left: { x: 116, y: 104 }, right: { x: 184, y: 104 } }
  const sideHipY = isNatty ? 214 : bodyBottomY
  const hipsAxis = side
    ? { left: { x: 145, y: sideHipY }, right: { x: 158, y: sideHipY + 2 } }
    : { left: { x: 138, y: bodyBottomY }, right: { x: 162, y: bodyBottomY } }

  const upperArmLength = side ? 45 : 40
  const lowerArmLength = side ? 47 : 40
  const upperLegLength = side ? (isNatty ? 36 : 42) : 38
  const lowerLegLength = side ? (isNatty ? 42 : 48) : isNatty ? 38 : 45

  const elbowsAxis = {
    left: pointFrom(shouldersAxis.left, joints.leftShoulder, upperArmLength),
    right: pointFrom(shouldersAxis.right, joints.rightShoulder, upperArmLength),
  }
  const handsAxis = {
    left: pointFrom(elbowsAxis.left, joints.leftShoulder + joints.leftElbow, lowerArmLength),
    right: pointFrom(elbowsAxis.right, joints.rightShoulder + joints.rightElbow, lowerArmLength),
  }
  const kneesAxis = {
    left: pointFrom(hipsAxis.left, joints.leftHip, upperLegLength),
    right: pointFrom(hipsAxis.right, joints.rightHip, upperLegLength),
  }
  const feetAxis = {
    left: pointFrom(kneesAxis.left, joints.leftHip + joints.leftKnee, lowerLegLength),
    right: pointFrom(kneesAxis.right, joints.rightHip + joints.rightKnee, lowerLegLength),
  }

  return {
    axis,
    view: config.view,
    scale,
    isNatty,
    bodyTopY,
    bodyBottomY,
    bodyHeight,
    shoulders: mapPair(shouldersAxis, config.view),
    elbows: mapPair(elbowsAxis, config.view),
    hands: mapPair(handsAxis, config.view),
    hips: mapPair(hipsAxis, config.view),
    knees: mapPair(kneesAxis, config.view),
    feet: mapPair(feetAxis, config.view),
  }
}

export function linePath(...points: Point[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ")
}

export function segmentAngleDeg(from: Point, to: Point) {
  return normalizeAngle((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI)
}

export function displayHardwareAngle(segmentAngle: number) {
  const normalized = normalizeAngle(segmentAngle)
  if (normalized > 90) return normalized - 180
  if (normalized < -90) return normalized + 180
  return normalized
}

export function inverseScalePoint(point: Point, scale: number): Point {
  return {
    x: ROBOT_2D_CENTER.x + (point.x - ROBOT_2D_CENTER.x) / scale,
    y: ROBOT_2D_CENTER.y + (point.y - ROBOT_2D_CENTER.y) / scale,
  }
}

export function scaledGroupTransform(scale: number) {
  return `translate(${ROBOT_2D_CENTER.x} ${ROBOT_2D_CENTER.y}) scale(${scale}) translate(${-ROBOT_2D_CENTER.x} ${-ROBOT_2D_CENTER.y})`
}

export function limbRoleLabel(view: RobotView, side: "left" | "right") {
  if (view === "side") return side === "left" ? "奥側" : "手前側"
  if (view === "back") return side === "left" ? "右側" : "左側"
  return side === "left" ? "左側" : "右側"
}

export function baseLabel(base: RobotBase) {
  return base === "natty" ? "ナッティ" : "ボルタ"
}
