import type { CustomHeldItemAdjustment, RobotHeldItemReference, RobotItem } from "@/lib/types"

export const DEFAULT_CUSTOM_HELD_ITEM_ADJUSTMENT: Readonly<CustomHeldItemAdjustment> = Object.freeze({
  offsetX: 0,
  offsetY: 0,
  rotationDeg: 0,
  scale: 1,
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function finite(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeCustomHeldItemAdjustment(value: unknown): CustomHeldItemAdjustment {
  const input = isRecord(value) ? value : {}
  return {
    offsetX: clamp(finite(input.offsetX, 0), -90, 90),
    offsetY: clamp(finite(input.offsetY, 0), -90, 90),
    rotationDeg: clamp(finite(input.rotationDeg, 0), -180, 180),
    scale: clamp(Math.abs(finite(input.scale, 1)), 0.3, 2.5),
  }
}

export function normalizeRobotHeldItem(value: unknown, fallbackItem: RobotItem): RobotHeldItemReference {
  if (!isRecord(value)) return { kind: "builtin", item: fallbackItem }
  if (value.kind === "custom" && typeof value.customItemId === "string" && value.customItemId.trim()) {
    return {
      kind: "custom",
      customItemId: value.customItemId.slice(0, 100),
      adjustment: normalizeCustomHeldItemAdjustment(value.adjustment),
    }
  }
  if (value.kind === "builtin" && typeof value.item === "string") {
    const item = ["none", "wrench", "flower", "gear", "heart"].includes(value.item)
      ? (value.item as RobotItem)
      : fallbackItem
    return { kind: "builtin", item }
  }
  return { kind: "builtin", item: fallbackItem }
}
