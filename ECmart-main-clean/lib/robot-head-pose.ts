import type { RobotHeadPose } from "@/lib/types"

export const HEAD_YAW_LIMIT = 30
export const HEAD_PITCH_LIMIT = 15
export const EYE_YAW_LIMIT = 15
export const EYE_PITCH_LIMIT = 8

export const DEFAULT_ROBOT_HEAD_POSE: Readonly<RobotHeadPose> = Object.freeze({
  yaw: 0,
  pitch: 0,
  eyeYaw: 0,
  eyePitch: 0,
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function numberInRange(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  return Math.min(max, Math.max(min, value))
}

export function normalizeRobotHeadPose(value: unknown): RobotHeadPose {
  if (!isRecord(value)) return { ...DEFAULT_ROBOT_HEAD_POSE }
  return {
    yaw: numberInRange(value.yaw, -HEAD_YAW_LIMIT, HEAD_YAW_LIMIT),
    pitch: numberInRange(value.pitch, -HEAD_PITCH_LIMIT, HEAD_PITCH_LIMIT),
    eyeYaw: numberInRange(value.eyeYaw, -EYE_YAW_LIMIT, EYE_YAW_LIMIT),
    eyePitch: numberInRange(value.eyePitch, -EYE_PITCH_LIMIT, EYE_PITCH_LIMIT),
  }
}
