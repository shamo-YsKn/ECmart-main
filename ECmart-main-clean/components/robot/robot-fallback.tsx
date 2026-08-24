"use client"

import { useId } from "react"
import type { RobotConfig, RobotItem } from "@/lib/types"
import { normalizeRobotHeadPose } from "@/lib/robot-head-pose"
import {
  ROBOT_2D_VIEWBOX,
  buildRobot2DLayout,
  displayHardwareAngle,
  linePath,
  scaledGroupTransform,
  segmentAngleDeg,
  type Point,
} from "@/lib/robot-pose-2d"

type HandSpec = { x: number; y: number; angle: number }
type ItemAnchor = { x: number; y: number; rotation: number }

function ItemShape({ item, accentColor, anchor }: { item: RobotItem; accentColor: string; anchor: ItemAnchor }) {
  if (item === "none") return null

  if (item === "wrench") {
    return (
      <g transform={`translate(${anchor.x} ${anchor.y}) rotate(${anchor.rotation})`}>
        <rect x="-5" y="-28" width="10" height="54" rx="5" fill={accentColor} />
        <path d="M-15 -35 L-5 -25 L5 -25 L15 -35 L10 -47 L0 -39 L-10 -47 Z" fill={accentColor} />
        <circle cx="0" cy="28" r="8" fill="none" stroke="#263943" strokeWidth="5" />
      </g>
    )
  }

  if (item === "gear") {
    return (
      <g transform={`translate(${anchor.x} ${anchor.y}) rotate(${anchor.rotation})`} fill={accentColor}>
        <circle r="20" />
        {Array.from({ length: 8 }, (_, index) => (
          <rect key={index} x="-5" y="-31" width="10" height="15" rx="2" transform={`rotate(${index * 45})`} />
        ))}
        <circle r="8" fill="#263943" />
      </g>
    )
  }

  if (item === "flower") {
    return (
      <g transform={`translate(${anchor.x} ${anchor.y}) rotate(${anchor.rotation})`}>
        <path d="M0 35 C-3 12 4 -3 1 -27" fill="none" stroke="#4d8757" strokeWidth="5" strokeLinecap="round" />
        {Array.from({ length: 6 }, (_, index) => {
          const angle = (index / 6) * Math.PI * 2
          return <circle key={index} cx={Math.cos(angle) * 13} cy={-30 + Math.sin(angle) * 13} r="10" fill={accentColor} />
        })}
        <circle cy="-30" r="8" fill="#e4ad32" />
      </g>
    )
  }

  return (
    <path
      transform={`translate(${anchor.x} ${anchor.y}) rotate(${anchor.rotation}) scale(.75)`}
      d="M0 35 C-34 14 -43 -16 -25 -29 C-10 -40 -1 -28 0 -18 C1 -28 10 -40 25 -29 C43 -16 34 14 0 35 Z"
      fill={accentColor}
    />
  )
}

function CounterSunkHand({ spec, fill }: { spec: HandSpec; fill: string }) {
  return (
    <g transform={`translate(${spec.x} ${spec.y}) rotate(${spec.angle})`}>
      <path d="M-15 -5 Q-11 -10 -6 -10 H6 Q11 -10 15 -5 L8 8 H-8 Z" fill={fill} stroke="#263943" strokeWidth="3" />
      <path d="M-8 -4 H8" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

function CounterSunkFoot({ x, y, angle, fill }: { x: number; y: number; angle: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path
        d="M-8 -10 Q-14 -9 -17 -2 L-27 11 H27 L17 -2 Q14 -9 8 -10 Z"
        fill={fill}
        stroke="#263943"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M-18 5 H18" stroke="#fff" strokeOpacity=".3" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

function SideFoot({ x, y, angle, fill }: { x: number; y: number; angle: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <rect x="-16" y="-7" width="32" height="14" rx="3" fill={fill} stroke="#263943" strokeWidth="3" />
      <path d="M-11 -2 H11" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

function Limb({ path, bodyColor, opacity = 1 }: { path: string; bodyColor: string; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <path d={path} fill="none" stroke="#263943" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke={bodyColor} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

function handSpec(elbow: Point, hand: Point): HandSpec {
  return {
    x: hand.x,
    y: hand.y,
    angle: displayHardwareAngle(segmentAngleDeg(elbow, hand)),
  }
}

function itemAnchor(elbow: Point, hand: Point): ItemAnchor {
  const angle = displayHardwareAngle(segmentAngleDeg(elbow, hand))
  const rad = (angle * Math.PI) / 180
  return {
    x: hand.x + Math.cos(rad) * 24,
    y: hand.y + Math.sin(rad) * 24,
    rotation: angle,
  }
}

function EyeScrewFront({
  x,
  y,
  metalId,
  accentColor,
  scale = 1,
}: {
  x: number
  y: number
  metalId: string
  accentColor: string
  scale?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle r="19" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
      <path d="M-10 0 H10 M0 -10 V10" stroke={accentColor} strokeWidth="5" strokeLinecap="round" />
    </g>
  )
}

function EyeScrewBack({ x, y, metalId, scale = 1 }: { x: number; y: number; metalId: string; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`}>
      <rect x={x - 5} y={y + 14} width="10" height="12" rx="3" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="2.5" />
      <circle cx={x} cy={y} r="16" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="3.5" />
      <circle cx={x} cy={y} r="5" fill="none" stroke="#263943" strokeOpacity=".45" strokeWidth="2" />
    </g>
  )
}

function FrontOrBackHead({ config, metalId }: { config: RobotConfig; metalId: string }) {
  const isBack = config.view === "back"
  const head = normalizeRobotHeadPose(config.headPose)
  const headShiftX = head.yaw * 0.12
  const headShiftY = head.pitch * 0.14
  const headTilt = head.pitch * 0.22
  const eyeShiftX = head.yaw * 0.08 + head.eyeYaw * 0.2
  const eyeShiftY = head.pitch * 0.04 + head.eyePitch * 0.24
  const turn = Math.abs(head.yaw) / 30
  const farEyeScale = 1 - turn * 0.1
  const nearEyeScale = 1 + turn * 0.04
  const leftScale = head.yaw >= 0 ? farEyeScale : nearEyeScale
  const rightScale = head.yaw >= 0 ? nearEyeScale : farEyeScale

  return (
    <g transform={`translate(150 85) translate(${headShiftX} ${headShiftY}) rotate(${headTilt}) translate(-150 -85)`}>
      {isBack ? (
        <>
          {/* 背面でも、ボルト頭本体と目ねじの裏側を別部品として描画します。 */}
          <path d="M112 82 L121 74 H179 L188 82 V102 L179 110 H121 L112 102 Z" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" strokeLinejoin="round" />
          <path d="M121 78 H179" stroke="#fff" strokeOpacity=".28" strokeWidth="3" strokeLinecap="round" />
          <EyeScrewBack x={132 + eyeShiftX} y={56 + eyeShiftY} metalId={metalId} scale={leftScale} />
          <EyeScrewBack x={168 + eyeShiftX} y={56 + eyeShiftY} metalId={metalId} scale={rightScale} />
        </>
      ) : (
        <>
          <path d="M112 74 L121 66 H179 L188 74 V96 L179 104 H121 L112 96 Z" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" strokeLinejoin="round" />
          <path d="M121 70 H179" stroke="#fff" strokeOpacity=".34" strokeWidth="3" strokeLinecap="round" />
          <EyeScrewFront x={132 + eyeShiftX} y={67 + eyeShiftY} metalId={metalId} accentColor={config.accentColor} scale={leftScale} />
          <EyeScrewFront x={168 + eyeShiftX} y={67 + eyeShiftY} metalId={metalId} accentColor={config.accentColor} scale={rightScale} />
        </>
      )}
    </g>
  )
}

function SideHead({ config, metalId }: { config: RobotConfig; metalId: string }) {
  const head = normalizeRobotHeadPose(config.headPose)
  const headShiftX = head.yaw * 0.18
  const headShiftY = head.pitch * 0.14
  const headTilt = head.pitch * 0.28
  const eyeShiftX = head.eyeYaw * 0.18 + head.yaw * 0.06
  const eyeShiftY = head.eyePitch * 0.18

  return (
    <g transform={`translate(145 81) translate(${headShiftX} ${headShiftY}) rotate(${headTilt}) translate(-145 -81)`}>
      {/* 側面の頭部は、共有いただいた図に合わせて
          左の台形 = ボルト頭
          右の横長丸み矩形 = 目の役割をするねじの側面
          として分離表現します。 */}

      {/* 目ねじ（側面から見た円柱） */}
      <path d="M116 63 H181 Q193 63 193 75 V87 Q193 99 181 99 H116 Z" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
      <path d="M123 68 H178" stroke="#fff" strokeOpacity=".34" strokeWidth="3" strokeLinecap="round" />
      <path d="M116 63 V99" stroke="#263943" strokeOpacity=".42" strokeWidth="3" />

      {/* 2本の目ねじの重なりを、根元の短い線で控えめに示す */}
      <path d={`M116 ${75 + eyeShiftY} H122`} stroke="#263943" strokeOpacity=".48" strokeWidth="2.4" strokeLinecap="round" />
      <path d={`M116 ${87 + eyeShiftY} H122`} stroke="#263943" strokeOpacity=".34" strokeWidth="2.2" strokeLinecap="round" />

      {/* ボルト頭本体（先端の台形） */}
      <g transform={`translate(${eyeShiftX} ${eyeShiftY})`}>
        <path d="M90 61 L116 67 V95 L90 101 Z" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M95 66 L108 70 M95 96 L108 92" stroke="#fff" strokeOpacity=".26" strokeWidth="2" strokeLinecap="round" />
      </g>
    </g>
  )
}

function FrontOrBackRobot({ config, metalId }: { config: RobotConfig; metalId: string }) {
  const layout = buildRobot2DLayout(config)
  const leftArmPath = linePath(layout.shoulders.left, layout.elbows.left, layout.hands.left)
  const rightArmPath = linePath(layout.shoulders.right, layout.elbows.right, layout.hands.right)
  const leftLegPath = linePath(layout.hips.left, layout.knees.left, layout.feet.left)
  const rightLegPath = linePath(layout.hips.right, layout.knees.right, layout.feet.right)
  const leftHand = handSpec(layout.elbows.left, layout.hands.left)
  const rightHand = handSpec(layout.elbows.right, layout.hands.right)
  const leftFootAngle = displayHardwareAngle(segmentAngleDeg(layout.knees.left, layout.feet.left)) * 0.18
  const rightFootAngle = displayHardwareAngle(segmentAngleDeg(layout.knees.right, layout.feet.right)) * 0.18

  return (
    <>
      <Limb path={leftArmPath} bodyColor={config.bodyColor} />
      <Limb path={rightArmPath} bodyColor={config.bodyColor} />
      <CounterSunkHand spec={leftHand} fill={`url(#${metalId})`} />
      <CounterSunkHand spec={rightHand} fill={`url(#${metalId})`} />

      <circle cx={layout.shoulders.left.x} cy={layout.shoulders.left.y} r="10" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
      <circle cx={layout.shoulders.right.x} cy={layout.shoulders.right.y} r="10" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />

      <Limb path={leftLegPath} bodyColor={config.bodyColor} />
      <Limb path={rightLegPath} bodyColor={config.bodyColor} />
      <CounterSunkFoot x={layout.feet.left.x} y={layout.feet.left.y} angle={leftFootAngle} fill={`url(#${metalId})`} />
      <CounterSunkFoot x={layout.feet.right.x} y={layout.feet.right.y} angle={rightFootAngle} fill={`url(#${metalId})`} />

      <rect x="128" y={layout.bodyTopY} width="44" height={layout.bodyHeight} rx="20" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
      {Array.from({ length: layout.isNatty ? 10 : 12 }, (_, index) => {
        const y = layout.bodyTopY + 10 + index * 8
        if (y >= layout.bodyBottomY - 3) return null
        return <line key={index} x1="125" x2="175" y1={y} y2={y} stroke="#263943" strokeOpacity=".72" strokeWidth="4" strokeLinecap="round" />
      })}

      {layout.isNatty && (
        <path d="M129 153 H171 L197 182 H103 Z" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" strokeLinejoin="round" />
      )}

      <FrontOrBackHead config={config} metalId={metalId} />

      <ItemShape item={config.item} accentColor={config.accentColor} anchor={itemAnchor(layout.elbows.right, layout.hands.right)} />
    </>
  )
}

function SideRobot({ config, metalId }: { config: RobotConfig; metalId: string }) {
  const layout = buildRobot2DLayout(config)
  const farArmPath = linePath(layout.shoulders.left, layout.elbows.left, layout.hands.left)
  const nearArmPath = linePath(layout.shoulders.right, layout.elbows.right, layout.hands.right)
  const farLegPath = linePath(layout.hips.left, layout.knees.left, layout.feet.left)
  const nearLegPath = linePath(layout.hips.right, layout.knees.right, layout.feet.right)
  const farHand = handSpec(layout.elbows.left, layout.hands.left)
  const nearHand = handSpec(layout.elbows.right, layout.hands.right)
  const farFootAngle = displayHardwareAngle(segmentAngleDeg(layout.knees.left, layout.feet.left)) * 0.12
  const nearFootAngle = displayHardwareAngle(segmentAngleDeg(layout.knees.right, layout.feet.right)) * 0.12

  return (
    <>
      <Limb path={farArmPath} bodyColor={config.bodyColor} opacity={0.58} />
      <g opacity="0.62"><CounterSunkHand spec={farHand} fill={`url(#${metalId})`} /></g>
      <Limb path={farLegPath} bodyColor={config.bodyColor} opacity={0.58} />
      <g opacity="0.62"><SideFoot x={layout.feet.left.x} y={layout.feet.left.y} angle={farFootAngle} fill={`url(#${metalId})`} /></g>

      <rect
        x="126"
        y={layout.bodyTopY}
        width="52"
        height={layout.bodyHeight}
        rx={layout.isNatty ? 4 : 18}
        fill={`url(#${metalId})`}
        stroke="#263943"
        strokeWidth="4"
      />
      {Array.from({ length: 13 }, (_, index) => {
        const y = layout.bodyTopY + 10 + index * 8
        if (y >= layout.bodyBottomY - 4) return null
        return <line key={index} x1="124" x2="180" y1={y} y2={y} stroke="#263943" strokeOpacity=".72" strokeWidth="4" strokeLinecap="round" />
      })}

      {layout.isNatty && (
        <path d="M124 188 H180 L204 218 H100 Z" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" strokeLinejoin="round" />
      )}

      <SideHead config={config} metalId={metalId} />

      <circle cx={layout.shoulders.right.x} cy={layout.shoulders.right.y} r="9" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />

      <Limb path={nearArmPath} bodyColor={config.bodyColor} />
      <CounterSunkHand spec={nearHand} fill={`url(#${metalId})`} />
      <Limb path={nearLegPath} bodyColor={config.bodyColor} />
      <SideFoot x={layout.feet.right.x} y={layout.feet.right.y} angle={nearFootAngle} fill={`url(#${metalId})`} />

      <ItemShape item={config.item} accentColor={config.accentColor} anchor={itemAnchor(layout.elbows.right, layout.hands.right)} />
    </>
  )
}

export function RobotFallback({ config }: { config: RobotConfig }) {
  const id = useId().replace(/:/g, "")
  const metalId = `fallback-metal-${id}`
  const shadowId = `fallback-shadow-${id}`
  const layout = buildRobot2DLayout(config)

  return (
    <svg viewBox={ROBOT_2D_VIEWBOX} className="h-full w-full" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={metalId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.72" />
          <stop offset="0.22" stopColor={config.bodyColor} />
          <stop offset="0.68" stopColor={config.bodyColor} />
          <stop offset="1" stopColor="#172d36" stopOpacity="0.42" />
        </linearGradient>
        <filter id={shadowId} x="-35%" y="-30%" width="170%" height="180%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodOpacity="0.2" />
        </filter>
      </defs>

      <ellipse cx="150" cy="302" rx="82" ry="10" fill="#173744" opacity="0.11" />

      <g transform={scaledGroupTransform(layout.scale)} filter={`url(#${shadowId})`}>
        {config.view === "side" ? (
          <SideRobot config={config} metalId={metalId} />
        ) : (
          <FrontOrBackRobot config={config} metalId={metalId} />
        )}
      </g>
    </svg>
  )
}
