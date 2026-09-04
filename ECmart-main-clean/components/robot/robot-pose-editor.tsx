"use client"

import { useMemo, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import type { RobotConfig, RobotJointId, RobotPoseSpatial, RobotPoseState, RobotSpatialVector } from "@/lib/types"
import type { CustomItemDocument } from "@/lib/creation-model"
import { RobotFallback } from "./robot-fallback"
import {
  ROBOT_2D_VIEWBOX,
  buildRobot2DLayout,
  clampJointAngle,
  inverseScalePoint,
  limbRoleLabel,
  normalizeAngle,
  pointFromViewToAxis,
  resolveJointAngles,
  resolvePoseState,
  scaledGroupTransform,
  segmentAngleDeg,
  spatialSegmentForJoint,
  updatePoseAxisLinked,
  type Point,
} from "@/lib/robot-pose-2d"
import { cn } from "@/lib/utils"

export type PoseHandleId =
  | "leftElbow"
  | "leftHand"
  | "rightElbow"
  | "rightHand"
  | "leftKnee"
  | "leftFoot"
  | "rightKnee"
  | "rightFoot"

type DragState = {
  pointerId: number
  handle: PoseHandleId
}

const JOINT_BY_HANDLE: Record<PoseHandleId, RobotJointId> = {
  leftElbow: "leftShoulder",
  leftHand: "leftElbow",
  rightElbow: "rightShoulder",
  rightHand: "rightElbow",
  leftKnee: "leftHip",
  leftFoot: "leftKnee",
  rightKnee: "rightHip",
  rightFoot: "rightKnee",
}

function jointPartLabel(handle: PoseHandleId) {
  if (handle.endsWith("Elbow")) return "肩"
  if (handle.endsWith("Hand")) return "ひじ"
  if (handle.endsWith("Knee")) return "股関節"
  return "ひざ"
}

function parentPointForHandle(handle: PoseHandleId, layout: ReturnType<typeof buildRobot2DLayout>): Point {
  switch (handle) {
    case "leftElbow": return layout.shoulders.left
    case "leftHand": return layout.elbows.left
    case "rightElbow": return layout.shoulders.right
    case "rightHand": return layout.elbows.right
    case "leftKnee": return layout.hips.left
    case "leftFoot": return layout.knees.left
    case "rightKnee": return layout.hips.right
    case "rightFoot": return layout.knees.right
  }
}

function childPointForHandle(handle: PoseHandleId, layout: ReturnType<typeof buildRobot2DLayout>): Point {
  switch (handle) {
    case "leftElbow": return layout.elbows.left
    case "leftHand": return layout.hands.left
    case "rightElbow": return layout.elbows.right
    case "rightHand": return layout.hands.right
    case "leftKnee": return layout.knees.left
    case "leftFoot": return layout.feet.left
    case "rightKnee": return layout.knees.right
    case "rightFoot": return layout.feet.right
  }
}

function oppositeView(view: RobotConfig["view"]): "front" | "side" {
  return view === "side" ? "front" : "side"
}

function isArmHandle(handle: PoseHandleId) {
  return handle.endsWith("Elbow") || handle.endsWith("Hand")
}

function armPlaneLength(axis: "front" | "side", handle: PoseHandleId) {
  // 足と同じく「各ビューの平面上での操作長」を使う。
  // 正面は従来どおり40、側面は既存デザインの上腕45 / 前腕47を使う。
  if (axis === "front") return 40
  return handle.endsWith("Elbow") ? 45 : 47
}

function vectorBetween(from: Point, to: Point): RobotSpatialVector {
  return {
    x: to.x - from.x,
    y: 0,
    z: -(to.y - from.y),
  }
}

function seededArmSpatial(
  poseState: RobotPoseState,
  config: RobotConfig,
): RobotPoseSpatial {
  const next: RobotPoseSpatial = { ...(poseState.spatial ?? {}) }
  const frontLayout = buildRobot2DLayout({ ...config, view: "front", poseState: { ...poseState, spatial: {} } })

  const seeds: Array<[ReturnType<typeof spatialSegmentForJoint>, Point, Point]> = [
    ["leftUpperArm", frontLayout.shoulders.left, frontLayout.elbows.left],
    ["leftLowerArm", frontLayout.elbows.left, frontLayout.hands.left],
    ["rightUpperArm", frontLayout.shoulders.right, frontLayout.elbows.right],
    ["rightLowerArm", frontLayout.elbows.right, frontLayout.hands.right],
  ]

  for (const [segmentId, parent, child] of seeds) {
    if (!next[segmentId]) next[segmentId] = vectorBetween(parent, child)
  }
  return next
}

function armPlanarVector(
  axis: "front" | "side",
  handle: PoseHandleId,
  visibleAngleDeg: number,
  previous: RobotSpatialVector,
): RobotSpatialVector {
  const length = armPlaneLength(axis, handle)
  const rad = (visibleAngleDeg * Math.PI) / 180

  if (axis === "front") {
    // 正面 = XZ。Yは一切変更せず、従来と同じ半径でX/Zだけを動かす。
    return {
      x: Math.cos(rad) * length,
      y: previous.y,
      z: -Math.sin(rad) * length,
    }
  }

  // 側面 = YZ。Xは一切変更せず、Y/Zだけを動かす。
  // 正面で腕が真横になり側面投影が点になっていても、固定の側面操作長を使うため再びドラッグできる。
  return {
    x: previous.x,
    y: Math.cos(rad) * length,
    z: -Math.sin(rad) * length,
  }
}

export function RobotPoseEditor({
  config,
  enabled,
  onPoseStateChange,
  className,
  customItemDocument,
  linkedGuide,
  onInteractionChange,
}: {
  config: RobotConfig
  enabled: boolean
  onPoseStateChange: (poseState: RobotPoseState) => void
  className?: string
  customItemDocument?: CustomItemDocument | null
  linkedGuide?: { config: RobotConfig; handle: PoseHandleId } | null
  onInteractionChange?: (handle: PoseHandleId | null) => void
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const layout = useMemo(() => buildRobot2DLayout(config), [config])
  const poseState = resolvePoseState(config)

  const handlePoints = {
    leftElbow: layout.elbows.left,
    leftHand: layout.hands.left,
    rightElbow: layout.elbows.right,
    rightHand: layout.hands.right,
    leftKnee: layout.knees.left,
    leftFoot: layout.feet.left,
    rightKnee: layout.knees.right,
    rightFoot: layout.feet.right,
  } satisfies Record<PoseHandleId, Point>

  const linkedLayout = useMemo(() => linkedGuide ? buildRobot2DLayout(linkedGuide.config) : null, [linkedGuide])

  function toModelPoint(event: { clientX: number; clientY: number }): Point | null {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null

    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const svgPoint = point.matrixTransform(ctm.inverse())
    return inverseScalePoint({ x: svgPoint.x, y: svgPoint.y }, layout.scale)
  }

  function axisPoint(point: Point) {
    return pointFromViewToAxis(point, config.view)
  }

  function updateFromHandle(handle: PoseHandleId, visiblePoint: Point) {
    const point = axisPoint(visiblePoint)
    const shoulders = {
      left: axisPoint(layout.shoulders.left),
      right: axisPoint(layout.shoulders.right),
    }
    const elbows = {
      left: axisPoint(layout.elbows.left),
      right: axisPoint(layout.elbows.right),
    }
    const hips = {
      left: axisPoint(layout.hips.left),
      right: axisPoint(layout.hips.right),
    }
    const knees = {
      left: axisPoint(layout.knees.left),
      right: axisPoint(layout.knees.right),
    }

    const patch: Partial<Record<RobotJointId, number>> = {}
    switch (handle) {
      case "leftElbow":
        patch.leftShoulder = clampJointAngle("leftShoulder", segmentAngleDeg(shoulders.left, point))
        break
      case "leftHand": {
        const upper = segmentAngleDeg(shoulders.left, elbows.left)
        patch.leftElbow = clampJointAngle("leftElbow", normalizeAngle(segmentAngleDeg(elbows.left, point) - upper))
        break
      }
      case "rightElbow":
        patch.rightShoulder = clampJointAngle("rightShoulder", segmentAngleDeg(shoulders.right, point))
        break
      case "rightHand": {
        const upper = segmentAngleDeg(shoulders.right, elbows.right)
        patch.rightElbow = clampJointAngle("rightElbow", normalizeAngle(segmentAngleDeg(elbows.right, point) - upper))
        break
      }
      case "leftKnee":
        patch.leftHip = clampJointAngle("leftHip", segmentAngleDeg(hips.left, point))
        break
      case "leftFoot": {
        const upper = segmentAngleDeg(hips.left, knees.left)
        patch.leftKnee = clampJointAngle("leftKnee", normalizeAngle(segmentAngleDeg(knees.left, point) - upper))
        break
      }
      case "rightKnee":
        patch.rightHip = clampJointAngle("rightHip", segmentAngleDeg(hips.right, point))
        break
      case "rightFoot": {
        const upper = segmentAngleDeg(hips.right, knees.right)
        patch.rightKnee = clampJointAngle("rightKnee", normalizeAngle(segmentAngleDeg(knees.right, point) - upper))
        break
      }
    }

    const joint = JOINT_BY_HANDLE[handle]
    const currentAngles = resolveJointAngles(config, layout.axis)
    const nextResolved = { ...currentAngles, ...patch } as Required<RobotJointAngles>
    const parentJoint =
      joint === "leftElbow" ? "leftShoulder" :
      joint === "rightElbow" ? "rightShoulder" :
      joint === "leftKnee" ? "leftHip" :
      joint === "rightKnee" ? "rightHip" : null
    const absoluteAngle = parentJoint
      ? normalizeAngle(nextResolved[parentJoint] + nextResolved[joint])
      : nextResolved[joint]

    if (isArmHandle(handle)) {
      // 足の自然な挙動を腕にも合わせる。ただし腕は正面で真横になると側面投影が点になり得るため、
      // 現在の投影長ではなく各ビューの既定操作長を使い、XZ/YZを独立操作できるようにする。
      const seededSpatial = seededArmSpatial(poseState, config)
      const segmentId = spatialSegmentForJoint(joint)
      const previousVector = seededSpatial[segmentId] ?? { x: 0, y: 0, z: 0 }
      const vector = armPlanarVector(layout.axis, handle, absoluteAngle, previousVector)
      const spatialPatch: RobotPoseSpatial = {
        ...seededSpatial,
        [segmentId]: vector,
      }
      onPoseStateChange(updatePoseAxisLinked(poseState, layout.axis, patch, spatialPatch))
      return
    }

    // 脚は現在の挙動が自然なので、従来のXZ/YZ・Z共有処理を維持する。
    const sourceParent = parentPointForHandle(handle, layout)
    const sourceChild = childPointForHandle(handle, layout)
    const sourceLength = Math.max(1, Math.hypot(sourceChild.x - sourceParent.x, sourceChild.y - sourceParent.y))
    const sourceRad = (absoluteAngle * Math.PI) / 180
    const sourceHorizontal = Math.cos(sourceRad) * sourceLength
    const sharedZ = -Math.sin(sourceRad) * sourceLength

    const targetLayout = buildRobot2DLayout({ ...config, view: oppositeView(config.view) })
    const targetParent = parentPointForHandle(handle, targetLayout)
    const targetChild = childPointForHandle(handle, targetLayout)
    const targetHorizontal = targetChild.x - targetParent.x

    const previousVector = poseState.spatial?.[spatialSegmentForJoint(joint)]
    const vector: RobotSpatialVector = layout.axis === "front"
      ? {
          x: sourceHorizontal,
          y: previousVector?.y ?? targetHorizontal,
          z: sharedZ,
        }
      : {
          x: previousVector?.x ?? targetHorizontal,
          y: sourceHorizontal,
          z: sharedZ,
        }
    const spatialPatch: RobotPoseSpatial = {
      [spatialSegmentForJoint(joint)]: vector,
    }

    onPoseStateChange(updatePoseAxisLinked(poseState, layout.axis, patch, spatialPatch))
  }

  function startDrag(handle: PoseHandleId, event: ReactPointerEvent<SVGCircleElement>) {
    if (!enabled) return
    const point = toModelPoint(event)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    setDragState({ pointerId: event.pointerId, handle })
    onInteractionChange?.(handle)
    svgRef.current?.setPointerCapture(event.pointerId)
    updateFromHandle(handle, point)
  }

  function moveDrag(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return
    const point = toModelPoint(event)
    if (!point) return
    event.preventDefault()
    updateFromHandle(dragState.handle, point)
  }

  function endDrag(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return
    event.preventDefault()
    setDragState(null)
    onInteractionChange?.(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleLabel(handle: PoseHandleId) {
    const side = handle.startsWith("left") ? "left" : "right"
    return `${limbRoleLabel(config.view, side)}の${jointPartLabel(handle)}`
  }

  const linkedGuidePoint = useMemo(() => {
    if (!linkedGuide || !linkedLayout) return null
    const sourcePoints = {
      leftElbow: linkedLayout.elbows.left,
      leftHand: linkedLayout.hands.left,
      rightElbow: linkedLayout.elbows.right,
      rightHand: linkedLayout.hands.right,
      leftKnee: linkedLayout.knees.left,
      leftFoot: linkedLayout.feet.left,
      rightKnee: linkedLayout.knees.right,
      rightFoot: linkedLayout.feet.right,
    } satisfies Record<PoseHandleId, Point>
    const target = handlePoints[linkedGuide.handle]
    const source = sourcePoints[linkedGuide.handle]
    return { x: target.x, y: source.y }
  }, [handlePoints, linkedGuide, linkedLayout])

  return (
    <div className={cn("relative h-full w-full", className)}>
      <RobotFallback config={config} customItemDocument={customItemDocument} />
      {enabled && (
        <svg
          ref={svgRef}
          viewBox={ROBOT_2D_VIEWBOX}
          className="pointer-events-auto absolute inset-0 h-full w-full touch-none select-none"
          aria-hidden="true"
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={(event) => {
            if (dragState && !event.currentTarget.hasPointerCapture(dragState.pointerId)) {
              setDragState(null)
              onInteractionChange?.(null)
            }
          }}
        >
          <g transform={scaledGroupTransform(layout.scale)}>
            <path d={`M${layout.shoulders.left.x} ${layout.shoulders.left.y} L${layout.elbows.left.x} ${layout.elbows.left.y} L${layout.hands.left.x} ${layout.hands.left.y}`} fill="none" stroke="rgba(255,255,255,0.58)" strokeWidth="2" strokeDasharray="6 4" />
            <path d={`M${layout.shoulders.right.x} ${layout.shoulders.right.y} L${layout.elbows.right.x} ${layout.elbows.right.y} L${layout.hands.right.x} ${layout.hands.right.y}`} fill="none" stroke="rgba(255,255,255,0.58)" strokeWidth="2" strokeDasharray="6 4" />
            <path d={`M${layout.hips.left.x} ${layout.hips.left.y} L${layout.knees.left.x} ${layout.knees.left.y} L${layout.feet.left.x} ${layout.feet.left.y}`} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="6 4" />
            <path d={`M${layout.hips.right.x} ${layout.hips.right.y} L${layout.knees.right.x} ${layout.knees.right.y} L${layout.feet.right.x} ${layout.feet.right.y}`} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="6 4" />

            {linkedGuidePoint && (
              <g pointerEvents="none">
                <circle cx={linkedGuidePoint.x} cy={linkedGuidePoint.y} r="11" fill="rgba(249,115,22,0.16)" stroke="#f97316" strokeWidth="2" strokeDasharray="4 3" />
                <circle cx={linkedGuidePoint.x} cy={linkedGuidePoint.y} r="4.5" fill="#f97316" stroke="#ffffff" strokeWidth="2" />
              </g>
            )}

            {(Object.keys(handlePoints) as PoseHandleId[]).map((handle) => {
              const point = handlePoints[handle]
              const active = dragState?.handle === handle
              return (
                <g key={handle}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="16"
                    fill="transparent"
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(event) => startDrag(handle, event)}
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={active ? 9 : 7}
                    fill={active ? "#f97316" : "#ffffff"}
                    stroke="#334155"
                    strokeWidth="3"
                    pointerEvents="none"
                  />
                  <title>{handleLabel(handle)}</title>
                </g>
              )
            })}
          </g>
        </svg>
      )}
    </div>
  )
}
