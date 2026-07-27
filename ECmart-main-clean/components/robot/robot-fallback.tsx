"use client"

import { useId } from "react"
import type { RobotConfig, RobotItem } from "@/lib/types"
import { ROBOT_BASE_PARTS, ROBOT_POSE_PARTS } from "@/lib/robot-parts"

function ItemShape({ item, accentColor }: { item: RobotItem; accentColor: string }) {
  if (item === "none") return null

  if (item === "wrench") {
    return (
      <g transform="translate(232 165) rotate(-18)">
        <rect x="-5" y="-28" width="10" height="54" rx="5" fill={accentColor} />
        <path d="M-15 -35 L-5 -25 L5 -25 L15 -35 L10 -47 L0 -39 L-10 -47 Z" fill={accentColor} />
        <circle cx="0" cy="28" r="8" fill="none" stroke="#263943" strokeWidth="5" />
      </g>
    )
  }

  if (item === "gear") {
    return (
      <g transform="translate(236 166)" fill={accentColor}>
        <circle r="20" />
        {Array.from({ length: 8 }, (_, index) => (
          <rect
            key={index}
            x="-5"
            y="-31"
            width="10"
            height="15"
            rx="2"
            transform={`rotate(${index * 45})`}
          />
        ))}
        <circle r="8" fill="#263943" />
      </g>
    )
  }

  if (item === "flower") {
    return (
      <g transform="translate(236 162)">
        <path d="M0 35 C-3 12 4 -3 1 -27" fill="none" stroke="#4d8757" strokeWidth="5" strokeLinecap="round" />
        {Array.from({ length: 6 }, (_, index) => {
          const angle = (index / 6) * Math.PI * 2
          return (
            <circle
              key={index}
              cx={Math.cos(angle) * 13}
              cy={-30 + Math.sin(angle) * 13}
              r="10"
              fill={accentColor}
            />
          )
        })}
        <circle cy="-30" r="8" fill="#e4ad32" />
      </g>
    )
  }

  return (
    <path
      transform="translate(236 158) scale(.75)"
      d="M0 35 C-34 14 -43 -16 -25 -29 C-10 -40 -1 -28 0 -18 C1 -28 10 -40 25 -29 C43 -16 34 14 0 35 Z"
      fill={accentColor}
    />
  )
}

export function RobotFallback({ config }: { config: RobotConfig }) {
  const id = useId().replace(/:/g, "")
  const metalId = `fallback-metal-${id}`
  const shadowId = `fallback-shadow-${id}`
  const pose = ROBOT_POSE_PARTS[config.pose].twoD
  const isSide = config.view === "side"
  const isBack = config.view === "back"
  const scale = 0.8 + ((Math.min(90, Math.max(20, config.size)) - 20) / 70) * 0.2
  const basePart = ROBOT_BASE_PARTS[config.base]
  const bodyWidth = isSide ? 56 : basePart.twoD.bodyWidth
  const bodyX = 150 - bodyWidth / 2

  return (
    <svg
      viewBox="0 0 300 260"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={metalId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="0.22" stopColor={config.bodyColor} />
          <stop offset="0.68" stopColor={config.bodyColor} />
          <stop offset="1" stopColor="#172d36" stopOpacity="0.45" />
        </linearGradient>
        <filter id={shadowId} x="-25%" y="-25%" width="150%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodOpacity="0.2" />
        </filter>
      </defs>

      <ellipse cx="150" cy="232" rx="72" ry="12" fill="#173744" opacity="0.12" />

      <g transform={`translate(150 132) scale(${scale}) translate(-150 -132)`} filter={`url(#${shadowId})`}>
        {!isSide && (
          <>
            <path d={pose.left} fill="none" stroke="#263943" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
            <path d={pose.left} fill="none" stroke={config.bodyColor} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        <path d={pose.right} fill="none" stroke="#263943" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pose.right} fill="none" stroke={config.bodyColor} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />

        <path d="M126 184 L112 224" fill="none" stroke="#263943" strokeWidth="14" strokeLinecap="round" />
        <path d="M126 184 L112 224" fill="none" stroke={config.bodyColor} strokeWidth="9" strokeLinecap="round" />
        {!isSide && (
          <>
            <path d="M174 184 L188 224" fill="none" stroke="#263943" strokeWidth="14" strokeLinecap="round" />
            <path d="M174 184 L188 224" fill="none" stroke={config.bodyColor} strokeWidth="9" strokeLinecap="round" />
          </>
        )}

        <rect x="92" y="216" width="45" height="16" rx="7" fill={`url(#${metalId})`} transform="rotate(-4 115 224)" />
        {!isSide && <rect x="163" y="216" width="45" height="16" rx="7" fill={`url(#${metalId})`} transform="rotate(4 185 224)" />}

        <rect x={bodyX} y="103" width={bodyWidth} height="86" rx="16" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
        {Array.from({ length: 7 }, (_, index) => (
          <line
            key={index}
            x1={bodyX + 7}
            x2={bodyX + bodyWidth - 7}
            y1={116 + index * 10}
            y2={116 + index * 10}
            stroke="#ffffff"
            strokeOpacity="0.34"
            strokeWidth="3"
          />
        ))}

        {basePart.twoD.waist === "nut" ? (
          <polygon points="113,187 187,187 199,207 101,207" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
        ) : (
          <polygon points="125,187 175,187 184,202 116,202" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
        )}

        <g>
          <rect x={isSide ? 122 : 92} y="55" width={isSide ? 56 : 116} height="55" rx="12" fill={`url(#${metalId})`} stroke="#263943" strokeWidth="4" />
          {!isBack && !isSide && (
            <>
              <circle cx="124" cy="80" r="12" fill={config.bodyColor} stroke="#263943" strokeWidth="3" />
              <circle cx="176" cy="80" r="12" fill={config.bodyColor} stroke="#263943" strokeWidth="3" />
              <path d="M118 80 H130 M124 74 V86 M170 80 H182 M176 74 V86" stroke={config.accentColor} strokeWidth="3.5" strokeLinecap="round" />
            </>
          )}
          {!isBack && isSide && (
            <circle cx="159" cy="80" r="11" fill={config.bodyColor} stroke="#263943" strokeWidth="3" />
          )}
          {isBack && (
            <>
              <line x1="150" y1="61" x2="150" y2="104" stroke="#263943" strokeWidth="4" opacity="0.55" />
              <rect x="127" y="72" width="46" height="10" rx="5" fill={config.accentColor} opacity="0.75" />
            </>
          )}
        </g>

        <ItemShape item={config.item} accentColor={config.accentColor} />
      </g>
    </svg>
  )
}
