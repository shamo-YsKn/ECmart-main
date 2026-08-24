"use client"

import { useId } from "react"
import type { RobotConfig, RobotItem } from "@/lib/types"
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

function FrontOrBackRobot({ config, metalId }: { config: RobotConfig; metalId: string }) {
  const layout = buildRobot2DLayout(config)
  const isBack = config.view === "back"
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

      <path d="M112 74 L121 66 H179 L188 74 V96 L179 104 H121 L112 96 Z" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" strokeLinejoin="round" />
      <path d="M121 70 H179" stroke="#fff" strokeOpacity=".34" strokeWidth="3" strokeLinecap="round" />

      {!isBack ? (
        <>
          <circle cx="132" cy="67" r="19" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
          <circle cx="168" cy="67" r="19" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
          <path d="M122 67 H142 M132 57 V77 M158 67 H178 M168 57 V77" stroke={config.accentColor} strokeWidth="5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M123 74 H177" stroke="#263943" strokeOpacity=".6" strokeWidth="4" strokeLinecap="round" />
          <circle cx="150" cy="87" r="7" fill={config.bodyColor} stroke="#263943" strokeWidth="3" />
          <path d="M145 87 H155" stroke="#263943" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

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
      {/* 奥側の腕・脚を先に描き、PowerPoint案のように2本の奥行きを見せます。 */}
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

      {/* 側面頭部：共有図の台形＋横長の丸みを持つボルト頭プロファイル。 */}
      <path d="M96 58 L123 65 V94 L96 101 Z" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" strokeLinejoin="round" />
      <path d="M123 65 H181 Q193 65 193 77 V84 Q193 96 181 96 H123 Z" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
      <path d="M128 69 H179" stroke="#fff" strokeOpacity=".32" strokeWidth="3" strokeLinecap="round" />
      <path d="M123 65 V96" stroke="#263943" strokeOpacity=".5" strokeWidth="3" />

      <circle cx={layout.shoulders.right.x} cy={layout.shoulders.right.y} r="9" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />

      {/* 手前側を胴体の前に描画。 */}
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
