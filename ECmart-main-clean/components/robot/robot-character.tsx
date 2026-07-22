"use client"

import { useId } from "react"
import type { RobotConfig, RobotItem, RobotPose } from "@/lib/types"

/**
 * PowerPointで作成されたボルタ／ナッティの形を基準にしつつ、
 * 腕・脚を少し短くし、ボルタは男の子らしく、ナッティは女の子らしく見える
 * 立ち方になるよう調整したポーズ定義です。
 */
const POSE_ROTATIONS: Record<
  RobotConfig["base"],
  Record<RobotPose, { left: number; right: number }>
> = {
  volta: {
    stand: { left: -108, right: 108 },
    wave: { left: -114, right: 18 },
    cheer: { left: -10, right: 10 },
    point: { left: -116, right: 38 },
  },
  natty: {
    stand: { left: -92, right: 84 },
    wave: { left: -100, right: 2 },
    cheer: { left: -2, right: 18 },
    point: { left: -104, right: 28 },
  },
}

function normaliseHex(hex: string) {
  const value = hex.replace("#", "")
  return value.length === 3
    ? value
        .split("")
        .map((character) => character + character)
        .join("")
    : value
}

function darken(hex: string, amount = 0.28) {
  const value = normaliseHex(hex)
  const number = Number.parseInt(value, 16)
  const red = Math.max(0, Math.round(((number >> 16) & 0xff) * (1 - amount)))
  const green = Math.max(0, Math.round(((number >> 8) & 0xff) * (1 - amount)))
  const blue = Math.max(0, Math.round((number & 0xff) * (1 - amount)))

  return `#${((1 << 24) + (red << 16) + (green << 8) + blue)
    .toString(16)
    .slice(1)}`
}

function lighten(hex: string, amount = 0.16) {
  const value = normaliseHex(hex)
  const number = Number.parseInt(value, 16)
  const red = Math.min(
    255,
    Math.round(((number >> 16) & 0xff) + (255 - ((number >> 16) & 0xff)) * amount),
  )
  const green = Math.min(
    255,
    Math.round(((number >> 8) & 0xff) + (255 - ((number >> 8) & 0xff)) * amount),
  )
  const blue = Math.min(
    255,
    Math.round((number & 0xff) + (255 - (number & 0xff)) * amount),
  )

  return `#${((1 << 24) + (red << 16) + (green << 8) + blue)
    .toString(16)
    .slice(1)}`
}

function ScrewEye({
  x,
  y,
  metalColor,
  crossColor,
  showCross,
}: {
  x: number
  y: number
  metalColor: string
  crossColor: string
  showCross: boolean
}) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={24}
        fill={metalColor}
        stroke="#173744"
        strokeWidth={1.15}
      />
      {showCross && (
        <g stroke={crossColor} strokeWidth={5.5} strokeLinecap="square">
          <line x1={x - 15} y1={y} x2={x + 15} y2={y} />
          <line x1={x} y1={y - 15} x2={x} y2={y + 15} />
        </g>
      )}
    </g>
  )
}

function HeldItem({ item, color }: { item: RobotItem; color: string }) {
  if (item === "none") return null

  if (item === "wrench") {
    return (
      <g transform="translate(0 -23) rotate(22)">
        <path
          d="M-5 8 L-5 -13 L-11 -21 L-7 -28 L0 -23 L7 -28 L11 -21 L5 -13 L5 8 Z"
          fill={color}
          stroke="#173744"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        <circle cx={0} cy={5} r={2.3} fill="#173744" />
      </g>
    )
  }

  if (item === "gear") {
    return (
      <g transform="translate(0 -23)">
        {Array.from({ length: 8 }, (_, index) => (
          <rect
            key={index}
            x={-2.5}
            y={-16}
            width={5}
            height={8}
            fill={color}
            transform={`rotate(${index * 45})`}
          />
        ))}
        <circle r={12} fill={color} stroke="#173744" strokeWidth={1.2} />
        <circle r={4} fill="#173744" />
      </g>
    )
  }

  if (item === "flower") {
    return (
      <g transform="translate(0 -26)">
        <path
          d="M0 4 Q4 14 0 27"
          fill="none"
          stroke="#4d8757"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {Array.from({ length: 6 }, (_, index) => (
          <ellipse
            key={index}
            cx={0}
            cy={-6}
            rx={4.5}
            ry={9}
            fill={color}
            stroke={darken(color, 0.24)}
            strokeWidth={1}
            transform={`rotate(${index * 60})`}
          />
        ))}
        <circle r={4.5} fill="#e4ad32" stroke="#946c1c" strokeWidth={1} />
      </g>
    )
  }

  return (
    <path
      d="M0 -18 C-13 -31 -25 -13 0 7 C25 -13 13 -31 0 -18 Z"
      fill={color}
      stroke="#173744"
      strokeWidth={1.2}
      transform="scale(.72)"
    />
  )
}

function Arm({
  side,
  rotation,
  metalColor,
  item,
  itemColor,
}: {
  side: "left" | "right"
  rotation: number
  metalColor: string
  item: RobotItem
  itemColor: string
}) {
  const direction = side === "left" ? -1 : 1
  const shoulderX = side === "left" ? 96 : 144
  const endX = direction * 82
  const endY = -54
  const path = `M0 0 L${direction * 30} -10 L${direction * 56} -34 L${endX} ${endY}`

  return (
    <g transform={`translate(${shoulderX} 145) rotate(${rotation})`}>
      <path
        d={path}
        fill="none"
        stroke="#173744"
        strokeWidth={10}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d={path}
        fill="none"
        stroke={metalColor}
        strokeWidth={8}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      <polygon
        points={`${endX},${endY} ${endX + direction * 16},${endY - 21} ${endX + direction * 28},${endY + 1}`}
        fill={metalColor}
        stroke="#173744"
        strokeWidth={1.1}
        strokeLinejoin="miter"
      />

      {side === "right" && item !== "none" && (
        <g transform={`translate(${endX + direction * 20} ${endY - 4})`}>
          <HeldItem item={item} color={itemColor} />
        </g>
      )}
    </g>
  )
}

function ThreadedBody({
  clipId,
  metalColor,
}: {
  clipId: string
  metalColor: string
}) {
  const threadColor = darken(metalColor, 0.34)

  return (
    <g>
      <rect
        x={95}
        y={81}
        width={50}
        height={105}
        fill={metalColor}
        stroke="#173744"
        strokeWidth={1.15}
      />
      <g clipPath={`url(#${clipId})`}>
        {Array.from({ length: 11 }, (_, index) => (
          <rect
            key={index}
            x={93}
            y={87 + index * 9}
            width={54}
            height={4.6}
            fill={threadColor}
          />
        ))}
      </g>
      <line
        x1={99}
        y1={82}
        x2={99}
        y2={185}
        stroke={lighten(metalColor, 0.42)}
        strokeWidth={1.2}
        opacity={0.75}
      />
    </g>
  )
}

function Head({
  metalColor,
  crossColor,
  showDetails,
}: {
  metalColor: string
  crossColor: string
  showDetails: boolean
}) {
  return (
    <g>
      <rect
        x={69}
        y={36}
        width={51}
        height={45}
        fill={metalColor}
        stroke="#173744"
        strokeWidth={1.05}
      />
      <rect
        x={120}
        y={36}
        width={51}
        height={45}
        fill={metalColor}
        stroke="#173744"
        strokeWidth={1.05}
      />

      <ScrewEye
        x={91}
        y={31}
        metalColor={metalColor}
        crossColor={crossColor}
        showCross={showDetails}
      />
      <ScrewEye
        x={149}
        y={31}
        metalColor={metalColor}
        crossColor={crossColor}
        showCross={showDetails}
      />
    </g>
  )
}

function Legs({
  base,
  metalColor,
}: {
  base: RobotConfig["base"]
  metalColor: string
}) {
  const legPaths =
    base === "natty"
      ? {
          left: "M108 208 L92 238 L72 276",
          right: "M132 208 L150 238 L169 276",
          leftFoot: "66,272 76,277 72,287 62,281",
          rightFoot: "175,272 165,277 169,287 179,281",
        }
      : {
          left: "M104 196 L84 236 L64 274",
          right: "M136 196 L156 236 L176 274",
          leftFoot: "58,270 68,275 64,285 54,280",
          rightFoot: "182,270 172,275 176,285 186,280",
        }

  return (
    <g>
      {[legPaths.left, legPaths.right].map((path, index) => (
        <g key={path}>
          <path
            d={path}
            fill="none"
            stroke="#173744"
            strokeWidth={9}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <path
            d={path}
            fill="none"
            stroke={metalColor}
            strokeWidth={7}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <polygon
            points={index === 0 ? legPaths.leftFoot : legPaths.rightFoot}
            fill={metalColor}
            stroke="#173744"
            strokeWidth={1.1}
          />
        </g>
      ))}
    </g>
  )
}

function LowerBody({
  base,
  metalColor,
}: {
  base: RobotConfig["base"]
  metalColor: string
}) {
  if (base === "natty") {
    return (
      <polygon
        points="92,180 148,180 168,208 72,208"
        fill={metalColor}
        stroke="#173744"
        strokeWidth={1.15}
        strokeLinejoin="miter"
      />
    )
  }

  return (
    <polygon
      points="96,183 104,196 136,196 144,183"
      fill={metalColor}
      stroke="#173744"
      strokeWidth={1.15}
      strokeLinejoin="miter"
    />
  )
}

export function RobotCharacter({
  config,
  className,
}: {
  config: RobotConfig
  className?: string
}) {
  const clipId = `thread-${useId().replaceAll(":", "")}`
  const { bodyColor, accentColor, pose, item, view, size, base } = config
  const rotations = POSE_ROTATIONS[base][pose]
  const showDetails = view !== "back"
  const rotateY = view === "front" ? 0 : view === "side" ? -52 : 180
  const scale = 0.48 + ((size - 20) / 70) * 0.28

  return (
    <div
      className={className}
      style={{ perspective: "900px", overflow: "hidden" }}
      aria-label={`${config.name || (base === "volta" ? "ボルタ" : "ナッティ")}のプレビュー`}
      role="img"
    >
      <div
        style={{
          height: "100%",
          width: "100%",
          transformStyle: "preserve-3d",
          transform: `translateY(8px) rotateY(${rotateY}deg) scale(${scale})`,
          transformOrigin: "center center",
          transition: "transform 500ms cubic-bezier(0.34, 1.4, 0.4, 1)",
        }}
      >
        <svg
          viewBox="-12 0 264 308"
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full overflow-hidden"
        >
          <title>{config.name || (base === "volta" ? "ボルタ" : "ナッティ")}</title>
          <defs>
            <clipPath id={clipId}>
              <rect x={95} y={81} width={50} height={105} />
            </clipPath>
          </defs>

          <ellipse cx={120} cy={294} rx={68} ry={6} fill="#000" opacity={0.1} />

          <Arm
            side="left"
            rotation={rotations.left}
            metalColor={bodyColor}
            item="none"
            itemColor={accentColor}
          />
          <Arm
            side="right"
            rotation={rotations.right}
            metalColor={bodyColor}
            item={item}
            itemColor={accentColor}
          />

          <Legs base={base} metalColor={bodyColor} />
          <ThreadedBody clipId={clipId} metalColor={bodyColor} />
          <LowerBody base={base} metalColor={bodyColor} />
          <Head
            metalColor={bodyColor}
            crossColor={accentColor}
            showDetails={showDetails}
          />
        </svg>
      </div>
    </div>
  )
}
