"use client"

import { useId } from "react"
import type { RobotConfig, RobotItem, RobotPose } from "@/lib/types"
import { ROBOT_BASE_PARTS, ROBOT_POSE_PARTS } from "@/lib/robot-parts"

type HandSpec = { x: number; y: number; angle: number }

const HANDS_BY_POSE: Record<RobotPose, { left: HandSpec; right: HandSpec }> = {
  stand: {
    left: { x: 79, y: 177, angle: -70 },
    right: { x: 221, y: 177, angle: 70 },
  },
  wave: {
    left: { x: 79, y: 177, angle: -70 },
    right: { x: 222, y: 48, angle: 12 },
  },
  cheer: {
    left: { x: 78, y: 48, angle: -12 },
    right: { x: 222, y: 48, angle: 12 },
  },
  point: {
    left: { x: 79, y: 177, angle: -70 },
    right: { x: 267, y: 100, angle: 88 },
  },
}

function ItemShape({ item, accentColor }: { item: RobotItem; accentColor: string }) {
  if (item === "none") return null

  if (item === "wrench") {
    return (
      <g transform="translate(248 146) rotate(-18)">
        <rect x="-5" y="-28" width="10" height="54" rx="5" fill={accentColor} />
        <path d="M-15 -35 L-5 -25 L5 -25 L15 -35 L10 -47 L0 -39 L-10 -47 Z" fill={accentColor} />
        <circle cx="0" cy="28" r="8" fill="none" stroke="#263943" strokeWidth="5" />
      </g>
    )
  }

  if (item === "gear") {
    return (
      <g transform="translate(247 147)" fill={accentColor}>
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
      <g transform="translate(247 145)">
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
      transform="translate(247 141) scale(.75)"
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

function CounterSunkFoot({ x, flip, fill }: { x: number; flip: number; fill: string }) {
  return (
    <g transform={`translate(${x} 220) rotate(${flip * 2})`}>
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

export function RobotFallback({ config }: { config: RobotConfig }) {
  const id = useId().replace(/:/g, "")
  const metalId = `fallback-metal-${id}`
  const shadowId = `fallback-shadow-${id}`
  const pose = ROBOT_POSE_PARTS[config.pose].twoD
  const hands = HANDS_BY_POSE[config.pose]
  const isSide = config.view === "side"
  const isBack = config.view === "back"
  const scale = 0.8 + ((Math.min(90, Math.max(20, config.size)) - 20) / 70) * 0.2
  const basePart = ROBOT_BASE_PARTS[config.base]

  return (
    <svg viewBox="0 0 300 260" className="h-full w-full" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={metalId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.72" />
          <stop offset="0.22" stopColor={config.bodyColor} />
          <stop offset="0.68" stopColor={config.bodyColor} />
          <stop offset="1" stopColor="#172d36" stopOpacity="0.42" />
        </linearGradient>
        <filter id={shadowId} x="-25%" y="-25%" width="150%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodOpacity="0.2" />
        </filter>
      </defs>

      <ellipse cx="150" cy="237" rx="72" ry="10" fill="#173744" opacity="0.12" />

      <g transform={`translate(150 132) scale(${scale}) translate(-150 -132)`} filter={`url(#${shadowId})`}>
        {!isSide && (
          <>
            <path d={pose.left} fill="none" stroke="#263943" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <path d={pose.left} fill="none" stroke={config.bodyColor} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <CounterSunkHand spec={hands.left} fill={`url(#${metalId})`} />
          </>
        )}
        <path d={pose.right} fill="none" stroke="#263943" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pose.right} fill="none" stroke={config.bodyColor} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <CounterSunkHand spec={hands.right} fill={`url(#${metalId})`} />

        {/* The small round connectors reproduce the handmade Natty-style shoulder joint. */}
        {!isSide && <circle cx="116" cy="104" r="10" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />}
        <circle cx="184" cy="104" r="10" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />

        <path d="M138 183 L111 212" fill="none" stroke="#263943" strokeWidth="13" strokeLinecap="round" />
        <path d="M138 183 L111 212" fill="none" stroke={config.bodyColor} strokeWidth="8" strokeLinecap="round" />
        {!isSide && (
          <>
            <path d="M162 183 L189 212" fill="none" stroke="#263943" strokeWidth="13" strokeLinecap="round" />
            <path d="M162 183 L189 212" fill="none" stroke={config.bodyColor} strokeWidth="8" strokeLinecap="round" />
          </>
        )}
        <CounterSunkFoot x={111} flip={-1} fill={`url(#${metalId})`} />
        {!isSide && <CounterSunkFoot x={189} flip={1} fill={`url(#${metalId})`} />}

        {/* Long threaded screw shaft. */}
        <rect x="128" y="84" width="44" height="104" rx="20" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
        {Array.from({ length: 12 }, (_, index) => (
          <line key={index} x1="125" x2="175" y1={94 + index * 8} y2={94 + index * 8} stroke="#263943" strokeOpacity=".72" strokeWidth="4" strokeLinecap="round" />
        ))}

        {basePart.twoD.waist === "nut" && (
          <path d="M129 181 H171 L197 210 H103 Z" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" strokeLinejoin="round" />
        )}

        {/* Side view of a compact hex-bolt head. */}
        <path d="M112 57 L121 49 H179 L188 57 V79 L179 87 H121 L112 79 Z" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" strokeLinejoin="round" />
        <path d="M121 53 H179" stroke="#fff" strokeOpacity=".34" strokeWidth="3" strokeLinecap="round" />

        {!isBack && (
          <>
            <g opacity={isSide ? 0 : 1}>
              <circle cx="132" cy="43" r="19" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
              <circle cx="168" cy="43" r="19" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
              <path d="M122 43 H142 M132 33 V53 M158 43 H178 M168 33 V53" stroke={config.accentColor} strokeWidth="5" strokeLinecap="round" />
            </g>
            {isSide && (
              <>
                <circle cx="153" cy="43" r="18" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
                <path d="M144 43 H162 M153 34 V52" stroke={config.accentColor} strokeWidth="5" strokeLinecap="round" />
              </>
            )}
          </>
        )}
        {isBack && <rect x="129" y="61" width="42" height="9" rx="4.5" fill={config.accentColor} opacity=".72" />}

        <ItemShape item={config.item} accentColor={config.accentColor} />
      </g>
    </svg>
  )
}
