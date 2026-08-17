"use client"

import { useMemo, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import type { RobotConfig, RobotJointId, RobotPoseState } from "@/lib/types"
import { RobotFallback } from "./robot-fallback"
import {
  buildRobot2DLayout,
  clampJointAngle,
  inverseScalePoint,
  normalizeAngle,
  resolvePoseState,
  scaledGroupTransform,
  segmentAngleDeg,
  type Point,
} from "@/lib/robot-pose-2d"
import { cn } from "@/lib/utils"

type HandleId = "leftElbow" | "leftHand" | "rightElbow" | "rightHand" | "leftKnee" | "leftFoot" | "rightKnee" | "rightFoot"

type DragState = {
  pointerId: number
  handle: HandleId
}

const HANDLE_STYLES: Record<HandleId, { label: string; joint: RobotJointId }> = {
  leftElbow: { label: "左肩", joint: "leftShoulder" },
  leftHand: { label: "左ひじ", joint: "leftElbow" },
  rightElbow: { label: "右肩", joint: "rightShoulder" },
  rightHand: { label: "右ひじ", joint: "rightElbow" },
  leftKnee: { label: "左股関節", joint: "leftHip" },
  leftFoot: { label: "左ひざ", joint: "leftKnee" },
  rightKnee: { label: "右股関節", joint: "rightHip" },
  rightFoot: { label: "右ひざ", joint: "rightKnee" },
}

function labelForHandle(handle: HandleId) {
  return HANDLE_STYLES[handle].label
}

export function RobotPoseEditor({
  config,
  enabled,
  onPoseStateChange,
  className,
}: {
  config: RobotConfig
  enabled: boolean
  onPoseStateChange: (poseState: RobotPoseState) => void
  className?: string
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const layout = useMemo(() => buildRobot2DLayout(config), [config])
  const poseState = resolvePoseState(config)
  const showHandles = enabled && config.view === "front"

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

  function updateFromHandle(handle: HandleId, point: Point) {
    const nextJoints = { ...poseState.joints }
    switch (handle) {
      case "leftElbow":
        nextJoints.leftShoulder = clampJointAngle("leftShoulder", segmentAngleDeg(layout.shoulders.left, point))
        break
      case "leftHand": {
        const upper = nextJoints.leftShoulder ?? segmentAngleDeg(layout.shoulders.left, layout.elbows.left)
        nextJoints.leftElbow = clampJointAngle("leftElbow", normalizeAngle(segmentAngleDeg(layout.elbows.left, point) - upper))
        break
      }
      case "rightElbow":
        nextJoints.rightShoulder = clampJointAngle("rightShoulder", segmentAngleDeg(layout.shoulders.right, point))
        break
      case "rightHand": {
        const upper = nextJoints.rightShoulder ?? segmentAngleDeg(layout.shoulders.right, layout.elbows.right)
        nextJoints.rightElbow = clampJointAngle("rightElbow", normalizeAngle(segmentAngleDeg(layout.elbows.right, point) - upper))
        break
      }
      case "leftKnee":
        nextJoints.leftHip = clampJointAngle("leftHip", segmentAngleDeg(layout.hips.left, point))
        break
      case "leftFoot": {
        const upper = nextJoints.leftHip ?? segmentAngleDeg(layout.hips.left, layout.knees.left)
        nextJoints.leftKnee = clampJointAngle("leftKnee", normalizeAngle(segmentAngleDeg(layout.knees.left, point) - upper))
        break
      }
      case "rightKnee":
        nextJoints.rightHip = clampJointAngle("rightHip", segmentAngleDeg(layout.hips.right, point))
        break
      case "rightFoot": {
        const upper = nextJoints.rightHip ?? segmentAngleDeg(layout.hips.right, layout.knees.right)
        nextJoints.rightKnee = clampJointAngle("rightKnee", normalizeAngle(segmentAngleDeg(layout.knees.right, point) - upper))
        break
      }
    }

    onPoseStateChange({
      mode: "custom",
      preset: poseState.preset,
      joints: nextJoints,
    })
  }

  function startDrag(handle: HandleId, event: ReactPointerEvent<SVGCircleElement>) {
    if (!showHandles) return
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
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      <RobotFallback config={config} />
      {showHandles && (
        <svg ref={svgRef} viewBox="0 0 300 260" className="pointer-events-auto absolute inset-0 h-full w-full touch-none" aria-hidden="true">
          <g transform={scaledGroupTransform(layout.scale)}>
            <path d={`M${layout.shoulders.left.x} ${layout.shoulders.left.y} L${layout.elbows.left.x} ${layout.elbows.left.y} L${layout.hands.left.x} ${layout.hands.left.y}`} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeDasharray="6 4" />
            <path d={`M${layout.shoulders.right.x} ${layout.shoulders.right.y} L${layout.elbows.right.x} ${layout.elbows.right.y} L${layout.hands.right.x} ${layout.hands.right.y}`} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeDasharray="6 4" />
            <path d={`M${layout.hips.left.x} ${layout.hips.left.y} L${layout.knees.left.x} ${layout.knees.left.y} L${layout.feet.left.x} ${layout.feet.left.y}`} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeDasharray="6 4" />
            <path d={`M${layout.hips.right.x} ${layout.hips.right.y} L${layout.knees.right.x} ${layout.knees.right.y} L${layout.feet.right.x} ${layout.feet.right.y}`} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeDasharray="6 4" />
            {(Object.keys(handlePoints) as HandleId[]).map((handle) => {
              const point = handlePoints[handle]
              const active = dragState?.handle === handle
              return (
                <g key={handle}>
                  <circle cx={point.x} cy={point.y} r={active ? 9 : 7} fill={active ? "#f97316" : "#fff"} stroke="#334155" strokeWidth="3"
                    onPointerDown={(event) => startDrag(handle, event)}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  />
                  <title>{labelForHandle(handle)}</title>
                </g>
              )
            })}
          </g>
        </svg>
      )}
    </div>
  )
}
