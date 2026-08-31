import type { RobotConfig, RobotItem, RobotPose } from "@/lib/types"
import { snapMuralRobotY, type MuroranSpot } from "@/lib/mural-spots"
import { normalizeRobotConfig } from "@/lib/robot-config"

export interface AmbientMuralRobot {
  id: string
  generated: true
  label: string
  config: RobotConfig
  positionX: number
  positionY: number
  scale: number
  rotationDeg: number
}

type Position = { x: number; y: number }

function hashString(input: string) {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))]
}

function chooseBase(random: () => number, weights: { volta: number; natty: number }) {
  const total = Math.max(0.0001, weights.volta + weights.natty)
  return random() < weights.volta / total ? "volta" as const : "natty" as const
}

function tooClose(candidate: Position, existing: Position[]) {
  return existing.some((point) => {
    const dx = candidate.x - point.x
    const dy = (candidate.y - point.y) * 1.35
    return Math.sqrt(dx * dx + dy * dy) < 10.5
  })
}

export function localMuralDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function ambientRobotCount(spot: MuroranSpot, realPostCount: number) {
  if (realPostCount < spot.ambient.targetPopulation) {
    return Math.max(spot.ambient.minimumAmbient, spot.ambient.targetPopulation - realPostCount)
  }
  return spot.ambient.minimumAmbient
}

export function generateAmbientMuralRobots(
  spot: MuroranSpot,
  realPostCount: number,
  realPositions: Position[] = [],
  dateKey = localMuralDateKey(),
): AmbientMuralRobot[] {
  const count = ambientRobotCount(spot, realPostCount)
  const random = mulberry32(hashString(`${spot.id}|${dateKey}`))
  const occupied = [...realPositions]
  const result: AmbientMuralRobot[] = []

  for (let index = 0; index < count; index += 1) {
    let position = { x: 12 + random() * 76, y: 79.5 }
    position.y = snapMuralRobotY(spot, position.x, 72 + random() * 14)
    for (let attempt = 0; attempt < 24 && tooClose(position, occupied); attempt += 1) {
      position = { x: 10 + random() * 80, y: 79.5 }
      position.y = snapMuralRobotY(spot, position.x, 72 + random() * 14)
    }
    occupied.push(position)

    const base = chooseBase(random, spot.ambient.baseWeights)
    const pose = pick(random, spot.ambient.poses) as RobotPose
    const item = pick(random, spot.ambient.items) as RobotItem
    const bodyColor = pick(random, spot.ambient.bodyColors)
    const accentColor = pick(random, spot.ambient.accentColors)
    const size = Math.round(47 + random() * 16)
    const config = normalizeRobotConfig({
      base,
      pose,
      poseState: { mode: "preset", preset: pose, joints: {}, axes: { front: {}, side: {} } },
      item,
      heldItem: { kind: "builtin", item },
      view: "front",
      size,
      bodyColor,
      accentColor,
      name: base === "volta" ? "街のボルタ" : "街のナッティ",
      headPose: {
        yaw: Math.round(-8 + random() * 16),
        pitch: Math.round(-4 + random() * 8),
        eyeYaw: Math.round(-4 + random() * 8),
        eyePitch: Math.round(-2 + random() * 4),
      },
    })

    result.push({
      id: `ambient-${spot.id}-${dateKey}-${index}`,
      generated: true,
      label: config.base === "volta" ? "街のボルタ" : "街のナッティ",
      config,
      positionX: position.x,
      positionY: position.y,
      scale: 0.72 + random() * 0.3,
      rotationDeg: -6 + random() * 12,
    })
  }

  return result
}
