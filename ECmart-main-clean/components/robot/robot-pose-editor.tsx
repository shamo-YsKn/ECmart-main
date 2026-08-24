"use client"

import { useMemo, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import type { RobotConfig, RobotJointId, RobotPoseState } from "@/lib/types"
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
  resolvePoseState,
  scaledGroupTransform,
  segmentAngleDeg,
  updatePoseAxis,
  type Point,
} from "@/lib/robot-pose-2d"
import { cn } from "@/lib/utils"

type HandleId =
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
  handle: HandleId
}

const JOINT_BY_HANDLE: Record<HandleId, RobotJointId> = {
  leftElbow: "leftShoulder",
  leftHand: "leftElbow",
  rightElbow: "rightShoulder",
  rightHand: "rightElbow",
  leftKnee: "leftHip",
  leftFoot: "leftKnee",
  rightKnee: "rightHip",
  rightFoot: "rightKnee",
}

function jointPartLabel(handle: HandleId) {
  if (handle.endsWith("Elbow")) return "肩"
  if (handle.endsWith("Hand")) return "ひじ"
  if (handle.endsWith("Knee")) return "股関節"
  return "ひざ"
}

export function RobotPoseEditor({
  config,
  enabled,
  onPoseStateChange,
  className,
  customItemDocument,
}: {
  config: RobotConfig
  enabled: boolean
  onPoseStateChange: (poseState: RobotPoseState) => void
  className?: string
  customItemDocument?: CustomItemDocument | null
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
  } satisfies Record<HandleId, Point>

  function toModelPoint(event: ReactPointerEvent<SVGCircleElement> | PointerEvent): Point | null {
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

  function updateFromHandle(handle: HandleId, visiblePoint: Point) {
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

    onPoseStateChange(updatePoseAxis(poseState, layout.axis, patch))
  }

  function startDrag(handle: HandleId, event: ReactPointerEvent<SVGCircleElement>) {
    if (!enabled) return
    const point = toModelPoint(event)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    setDragState({ pointerId: event.pointerId, handle })
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromHandle(handle, point)
  }

  function moveDrag(event: ReactPointerEvent<SVGCircleElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return
    const point = toModelPoint(event)
    if (!point) return
    event.preventDefault()
    updateFromHandle(dragState.handle, point)
  }

  function endDrag(event: ReactPointerEvent<SVGCircleElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return
    event.preventDefault()
    setDragState(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleLabel(handle: HandleId) {
    const side = handle.startsWith("left") ? "left" : "right"
    return `${limbRoleLabel(config.view, side)}の${jointPartLabel(handle)}`
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      <RobotFallback config={config} customItemDocument={customItemDocument} />
      {enabled && (
        <svg
          ref={svgRef}
          viewBox={ROBOT_2D_VIEWBOX}
          className="pointer-events-auto absolute inset-0 h-full w-full touch-none select-none"
          aria-hidden="true"
        >
          <g transform={scaledGroupTransform(layout.scale)}>
            <path d={`M${layout.shoulders.left.x} ${layout.shoulders.left.y} L${layout.elbows.left.x} ${layout.elbows.left.y} L${layout.hands.left.x} ${layout.hands.left.y}`} fill="none" stroke="rgba(255,255,255,0.58)" strokeWidth="2" strokeDasharray="6 4" />
            <path d={`M${layout.shoulders.right.x} ${layout.shoulders.right.y} L${layout.elbows.right.x} ${layout.elbows.right.y} L${layout.hands.right.x} ${layout.hands.right.y}`} fill="none" stroke="rgba(255,255,255,0.58)" strokeWidth="2" strokeDasharray="6 4" />
            <path d={`M${layout.hips.left.x} ${layout.hips.left.y} L${layout.knees.left.x} ${layout.knees.left.y} L${layout.feet.left.x} ${layout.feet.left.y}`} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="6 4" />
            <path d={`M${layout.hips.right.x} ${layout.hips.right.y} L${layout.knees.right.x} ${layout.knees.right.y} L${layout.feet.right.x} ${layout.feet.right.y}`} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="6 4" />

            {(Object.keys(handlePoints) as HandleId[]).map((handle) => {
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
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
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
