import type { CustomItemPartPlacement, CustomItemView, Vec3 } from "@/lib/creation-model"

export const CUSTOM_ITEM_VIEW_OPTIONS: ReadonlyArray<{ value: CustomItemView; label: string; shortLabel: string }> = [
  { value: "front", label: "正面", shortLabel: "正面" },
  { value: "side", label: "側面", shortLabel: "側面" },
  { value: "back", label: "背面", shortLabel: "背面" },
]

export interface ProjectedItemPoint {
  x: number
  y: number
  /** cameraに近いほど大きい値。SVGの描画順決定に使う。 */
  depth: number
}

export function normalizeCustomItemView(value: unknown): CustomItemView {
  return value === "side" || value === "back" ? value : "front"
}

/** X=左右 / Y=上下 / Z=奥行き。正面から見て +Z が手前。 */
export function projectItemPosition(position: Vec3, view: CustomItemView): ProjectedItemPoint {
  const [x, y, z] = position
  if (view === "side") return { x: z, y, depth: x }
  if (view === "back") return { x: -x, y, depth: -z }
  return { x, y, depth: z }
}

export function translateItemPositionInView(position: Vec3, view: CustomItemView, dx: number, dy: number): Vec3 {
  if (view === "side") return [position[0], position[1] + dy, position[2] + dx]
  if (view === "back") return [position[0] - dx, position[1] + dy, position[2]]
  return [position[0] + dx, position[1] + dy, position[2]]
}

/** 各ビューで画面に正対する軸だけを2D回転として編集する。 */
export function itemRotationForView(rotationDeg: Vec3, view: CustomItemView) {
  if (view === "side") return rotationDeg[0]
  if (view === "back") return -rotationDeg[2]
  return rotationDeg[2]
}

export function updateItemRotationForView(rotationDeg: Vec3, view: CustomItemView, displayDeg: number): Vec3 {
  if (view === "side") return [displayDeg, rotationDeg[1], rotationDeg[2]]
  if (view === "back") return [rotationDeg[0], rotationDeg[1], -displayDeg]
  return [rotationDeg[0], rotationDeg[1], displayDeg]
}

export function itemPartsForView(parts: CustomItemPartPlacement[], view: CustomItemView, reverseDepth = false) {
  return parts
    .map((part, index) => ({ part, index, projected: projectItemPosition(part.transform.position, view) }))
    .sort((a, b) => (reverseDepth ? b.projected.depth - a.projected.depth : a.projected.depth - b.projected.depth) || a.index - b.index)
}

export function itemViewTransform(part: CustomItemPartPlacement, view: CustomItemView) {
  const projected = projectItemPosition(part.transform.position, view)
  const rotation = itemRotationForView(part.transform.rotationDeg, view)
  return `translate(${projected.x} ${projected.y}) rotate(${rotation}) scale(${part.transform.scale[0]})`
}

export function customItemViewLabel(view: CustomItemView) {
  return CUSTOM_ITEM_VIEW_OPTIONS.find((option) => option.value === view)?.label ?? "正面"
}
