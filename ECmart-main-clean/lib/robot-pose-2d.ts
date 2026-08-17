import type { RobotConfig, RobotJointAngles, RobotJointId, RobotPose, RobotPoseState } from "@/lib/types"

export type Point = { x: number; y: number }

export interface Robot2DLayout {
  scale: number
  isNatty: boolean
  bodyBottomY: number
  bodyHeight: number
  footY: number
  shoulders: { left: Point; right: Point }
  elbows: { left: Point; right: Point }
  hands: { left: Point; right: Point }
  hips: { left: Point; right: Point }
  knees: { left: Point; right: Point }
  feet: { left: Point; right: Point }
}

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

const ARM_UPPER = 40
const ARM_LOWER = 40
const LEG_UPPER = 34
const LEG_LOWER_VOLTA = 39
const LEG_LOWER_NATTY = 27
const CENTER = { x: 150, y: 132 }

const PRESET_JOINTS: Record<RobotPose, RobotJointAngles> = {
  stand: {
    leftShoulder: 124,
    leftElbow: -14,
    rightShoulder: 56,
    rightElbow: 14,
    leftHip: 126,
    leftKnee: -4,
    rightHip: 54,
    rightKnee: 4,
  },
  wave: {
    leftShoulder: 124,
    leftElbow: -14,
    rightShoulder: -38,
    rightElbow: -40,
    leftHip: 126,
    leftKnee: -4,
    rightHip: 54,
    rightKnee: 4,
  },
  cheer: {
    leftShoulder: -142,
    leftElbow: 20,
    rightShoulder: -38,
    rightElbow: 20,
    leftHip: 126,
    leftKnee: -4,
    rightHip: 54,
    rightKnee: 4,
  },
  point: {
    leftShoulder: 124,
    leftElbow: -14,
    rightShoulder: 0,
    rightElbow: -8,
    leftHip: 126,
    leftKnee: -4,
    rightHip: 54,
    rightKnee: 4,
  },
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

export function normalizeAngle(deg: number) {
  let result = deg
  while (result > 180) result -= 360
  while (result <= -180) result += 360
  return result
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function clampJointAngle(joint: RobotJointId, angle: number) {
  if (joint.includes("Shoulder") || joint.includes("Hip")) return clamp(normalizeAngle(angle), -170, 170)
  return clamp(normalizeAngle(angle), -155, 155)
}

export function getPresetJointAngles(pose: RobotPose): RobotJointAngles {
  return { ...PRESET_JOINTS[pose] }
}

export function normalizePoseState(pose: RobotPose, value: unknown): RobotPoseState {
  const fallback: RobotPoseState = { mode: "preset", preset: pose, joints: {} }
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback
  const raw = value as Record<string, unknown>
  const preset = typeof raw.preset === "string" && raw.preset in PRESET_JOINTS ? (raw.preset as RobotPose) : pose
  const mode = raw.mode === "custom" ? "custom" : "preset"
  const jointsInput = raw.joints && typeof raw.joints === "object" && !Array.isArray(raw.joints)
    ? (raw.joints as Record<string, unknown>)
    : {}
  const joints: RobotJointAngles = {}
  for (const jointId of ROBOT_POSE_JOINT_IDS) {
    const candidate = jointsInput[jointId]
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      joints[jointId] = clampJointAngle(jointId, candidate)
    }
  }
  return { mode, preset, joints }
}

export function resolvePoseState(config: Pick<RobotConfig, "pose" | "poseState">): RobotPoseState {
  return normalizePoseState(config.pose, config.poseState)
}

export function resolveJointAngles(config: Pick<RobotConfig, "base" | "pose" | "poseState">): Required<RobotJointAngles> {
  const poseState = resolvePoseState(config)
  const preset = getPresetJointAngles(poseState.preset)
  const joints = { ...preset, ...poseState.joints } as Required<RobotJointAngles>
  for (const jointId of ROBOT_POSE_JOINT_IDS) {
    joints[jointId] = clampJointAngle(jointId, joints[jointId] ?? preset[jointId] ?? 0)
  }
  return joints
}

function pointFrom(origin: Point, absoluteAngleDeg: number, length: number): Point {
  const rad = degToRad(absoluteAngleDeg)
  return {
    x: origin.x + Math.cos(rad) * length,
    y: origin.y + Math.sin(rad) * length,
  }
}

export function buildRobot2DLayout(config: Pick<RobotConfig, "base" | "size" | "pose" | "poseState">): Robot2DLayout {
  const isNatty = config.base === "natty"
  const scale = 0.8 + ((Math.min(90, Math.max(20, config.size)) - 20) / 70) * 0.2
  const bodyBottomY = isNatty ? 182 : 188
  const bodyHeight = bodyBottomY - 84
  const footY = isNatty ? 204 : 220
  const lowerLeg = isNatty ? LEG_LOWER_NATTY : LEG_LOWER_VOLTA
  const joints = resolveJointAngles(config)

  const shoulders = { left: { x: 116, y: 104 }, right: { x: 184, y: 104 } }
  const elbows = {
    left: pointFrom(shoulders.left, joints.leftShoulder, ARM_UPPER),
    right: pointFrom(shoulders.right, joints.rightShoulder, ARM_UPPER),
  }
  const hands = {
    left: pointFrom(elbows.left, joints.leftShoulder + joints.leftElbow, ARM_LOWER),
    right: pointFrom(elbows.right, joints.rightShoulder + joints.rightElbow, ARM_LOWER),
  }
  const hips = { left: { x: 138, y: bodyBottomY }, right: { x: 162, y: bodyBottomY } }
  const knees = {
    left: pointFrom(hips.left, joints.leftHip, LEG_UPPER),
    right: pointFrom(hips.right, joints.rightHip, LEG_UPPER),
  }
  const feet = {
    left: pointFrom(knees.left, joints.leftHip + joints.leftKnee, lowerLeg),
    right: pointFrom(knees.right, joints.rightHip + joints.rightKnee, lowerLeg),
  }

  // Keep the center and support line aligned to the original artwork.
  feet.left.y = footY
  feet.right.y = footY

  return { scale, isNatty, bodyBottomY, bodyHeight, footY, shoulders, elbows, hands, hips, knees, feet }
}

export function linePath(...points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ")
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
    x: CENTER.x + (point.x - CENTER.x) / scale,
    y: CENTER.y + (point.y - CENTER.y) / scale,
  }
}

export function scaledGroupTransform(scale: number) {
  return `translate(${CENTER.x} ${CENTER.y}) scale(${scale}) translate(${-CENTER.x} ${-CENTER.y})`
}
