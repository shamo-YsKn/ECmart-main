"use client"

import type { CustomItemView, WorkbenchPartType } from "@/lib/creation-model"
import { getWorkbenchVariant } from "@/lib/workbench-variants"

const METAL = "#c9a24b"
const DARK = "#263943"
const LIGHT = "#f8fafc"

function SidePartShape({ type, variantId, selected = false }: { type: WorkbenchPartType; variantId?: string; selected?: boolean }) {
  const variant = getWorkbenchVariant(variantId)
  const metal = variant?.materialColor ?? METAL
  const secondary = variant?.secondaryColor
  const ledColor = variant?.ledColor ?? (type === "led_red" ? "#ef4444" : type === "led_green" ? "#22c55e" : "#eab308")
  const selection = selected ? <rect x="-54" y="-54" width="108" height="108" rx="12" fill="none" stroke="#f97316" strokeWidth="3" strokeDasharray="7 5" vectorEffect="non-scaling-stroke" /> : null

  if (type === "hex_nut") return <g>{selection}<rect x="-10" y="-38" width="20" height="76" rx="5" fill={metal} stroke={DARK} strokeWidth="4"/><rect x="-12" y="-10" width="24" height="20" rx="3" fill="#f4ead6" stroke={DARK} strokeWidth="3"/><path d="M-5 -31 V-15 M-5 15 V31" stroke="#fff" strokeOpacity=".42" strokeWidth="3" strokeLinecap="round"/></g>
  if (type === "washer") return <g>{selection}<rect x="-5" y="-39" width="10" height="78" rx="4" fill={metal} stroke={DARK} strokeWidth="3.5"/><rect x="-7" y="-15" width="14" height="30" fill="#f4ead6" stroke={DARK} strokeWidth="2.5"/></g>
  if (type === "bolt") return <g>{selection}<path d="M0 -30 L26 -15 L26 15 L0 30 L-26 15 L-26 -15 Z" fill={metal} stroke={DARK} strokeWidth="4"/><circle r="12" fill="#aeb8bd" stroke={DARK} strokeWidth="3"/><path d="M-12 -16 Q0 -22 12 -16" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="3" strokeLinecap="round"/></g>
  if (type === "flat_head_screw") return <g>{selection}<circle r="29" fill={metal} stroke={DARK} strokeWidth="4"/><path d="M-20 0 H20" stroke={DARK} strokeWidth="4" strokeLinecap="round"/><circle r="8" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="2"/></g>
  if (type === "pan_head_screw") return <g>{selection}<circle r="31" fill={metal} stroke={DARK} strokeWidth="4"/><path d="M-18 0 H18 M0 -18 V18" stroke={DARK} strokeWidth="4" strokeLinecap="round"/><path d="M-15 -18 Q0 -26 15 -18" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round"/></g>
  if (type === "metal_rod") return <g>{selection}<circle r="11" fill={metal} stroke={DARK} strokeWidth="4"/><circle cx="-3" cy="-3" r="3" fill="#fff" opacity=".42"/></g>
  if (type === "wire") return <g>{selection}<path d="M0 -38 C-8 -20 8 -7 0 8 C-8 22 5 31 0 40" fill="none" stroke={variant?.materialColor ?? DARK} strokeWidth="9" strokeLinecap="round"/><path d="M0 -38 C-8 -20 8 -7 0 8 C-8 22 5 31 0 40" fill="none" stroke={secondary ?? "#a8b2b8"} strokeWidth="5" strokeLinecap="round"/></g>
  if (type === "spring") return <g>{selection}<circle r="25" fill="none" stroke={variant?.materialColor ?? DARK} strokeWidth="9"/><circle r="16" fill="none" stroke={secondary ?? "#cbd2d5"} strokeWidth="5"/><circle r="6" fill="#f4ead6" stroke={DARK} strokeWidth="2"/></g>
  return <g>{selection}<path d="M-10 4 V36 M10 4 V43" stroke="#cbd2d5" strokeWidth="4" strokeLinecap="round"/><path d="M-17 0 V-16 Q-17 -38 0 -42 Q17 -38 17 -16 V0 Z" fill={ledColor} stroke={DARK} strokeWidth="4"/><path d="M-5 -30 Q1 -35 7 -30" fill="none" stroke={LIGHT} strokeOpacity=".45" strokeWidth="3" strokeLinecap="round"/><rect x="-20" y="-4" width="40" height="10" rx="4" fill="#bfc7cc" stroke={DARK} strokeWidth="3"/></g>
}

export function WorkbenchPartShape({
  type,
  variantId,
  selected = false,
  view = "front",
}: {
  type: WorkbenchPartType
  variantId?: string
  selected?: boolean
  view?: CustomItemView
}) {
  if (view === "side") return <SidePartShape type={type} variantId={variantId} selected={selected} />
  if (view === "back") return <g transform="scale(-1 1)"><WorkbenchPartShape type={type} variantId={variantId} selected={selected} view="front" /></g>
  const variant = getWorkbenchVariant(variantId)
  const metal = variant?.materialColor ?? METAL
  const secondary = variant?.secondaryColor
  const selection = selected ? (
    <rect x="-54" y="-54" width="108" height="108" rx="12" fill="none" stroke="#f97316" strokeWidth="3" strokeDasharray="7 5" vectorEffect="non-scaling-stroke" />
  ) : null

  if (type === "hex_nut") {
    return (
      <g>
        {selection}
        <path d="M-36 -20 L0 -41 L36 -20 L36 20 L0 41 L-36 20 Z M-13 -8 L0 -16 L13 -8 L13 8 L0 16 L-13 8 Z" fill={metal} fillRule="evenodd" stroke={DARK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M-24 -18 L0 -31 L20 -19" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />
      </g>
    )
  }

  if (type === "washer") {
    return (
      <g>
        {selection}
        <path d="M0 -39 A39 39 0 1 1 -.1 -39 M0 -17 A17 17 0 1 0 .1 -17" fill={metal} fillRule="evenodd" stroke={DARK} strokeWidth="4" />
        <path d="M-24 -24 A34 34 0 0 1 22 -25" fill="none" stroke="#fff" strokeOpacity=".42" strokeWidth="4" strokeLinecap="round" />
      </g>
    )
  }

  if (type === "bolt") {
    return (
      <g>
        {selection}
        <rect x="-12" y="-18" width="75" height="36" rx="9" fill={metal} stroke={DARK} strokeWidth="4" />
        {Array.from({ length: 6 }, (_, i) => <line key={i} x1={6 + i * 9} y1="-18" x2={-1 + i * 9} y2="18" stroke={DARK} strokeOpacity=".55" strokeWidth="3" />)}
        <path d="M-46 -26 H-12 L0 -18 V18 L-12 26 H-46 L-58 18 V-18 Z" fill={metal} stroke={DARK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M-43 -18 H-16" stroke="#fff" strokeOpacity=".42" strokeWidth="4" strokeLinecap="round" />
      </g>
    )
  }

  if (type === "flat_head_screw") {
    return (
      <g>
        {selection}
        <rect x="5" y="-9" width="62" height="18" rx="7" fill={metal} stroke={DARK} strokeWidth="3.5" />
        <path d="M-38 -29 Q-23 -38 -6 -25 L12 -9 V9 L-6 25 Q-23 38 -38 29 L-54 8 V-8 Z" fill={metal} stroke={DARK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M-37 0 H-7" stroke={DARK} strokeWidth="4" strokeLinecap="round" />
      </g>
    )
  }

  if (type === "pan_head_screw") {
    return (
      <g>
        {selection}
        <rect x="0" y="-9" width="67" height="18" rx="7" fill={metal} stroke={DARK} strokeWidth="3.5" />
        <path d="M-48 0 Q-45 -31 -12 -34 Q12 -31 18 -8 V8 Q12 31 -12 34 Q-45 31 -48 0 Z" fill={metal} stroke={DARK} strokeWidth="4" />
        <path d="M-27 0 H0 M-14 -13 V13" stroke={DARK} strokeWidth="4" strokeLinecap="round" />
      </g>
    )
  }

  if (type === "metal_rod") {
    return (
      <g>
        {selection}
        <rect x="-64" y="-10" width="128" height="20" rx="10" fill={metal} stroke={DARK} strokeWidth="4" />
        <path d="M-50 -4 H46" stroke="#fff" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />
      </g>
    )
  }

  if (type === "wire") {
    return (
      <g>
        {selection}
        <path d="M-61 23 C-42 -28 -14 -29 0 0 C13 27 39 31 61 -19" fill="none" stroke={variant?.materialColor ?? DARK} strokeWidth="9" strokeLinecap="round" />
        <path d="M-61 23 C-42 -28 -14 -29 0 0 C13 27 39 31 61 -19" fill="none" stroke={secondary ?? "#a8b2b8"} strokeWidth="5" strokeLinecap="round" />
      </g>
    )
  }

  if (type === "spring") {
    return (
      <g>
        {selection}
        <path d="M-65 0 L-54 -20 L-36 20 L-18 -20 L0 20 L18 -20 L36 20 L54 -20 L65 0" fill="none" stroke={variant?.materialColor ?? DARK} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M-65 0 L-54 -20 L-36 20 L-18 -20 L0 20 L18 -20 L36 20 L54 -20 L65 0" fill="none" stroke={secondary ?? "#cbd2d5"} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    )
  }

  const ledColor = variant?.ledColor ?? (type === "led_red" ? "#ef4444" : type === "led_green" ? "#22c55e" : "#eab308")
  return (
    <g>
      {selection}
      <path d="M-16 4 V35 M16 4 V43" stroke={DARK} strokeWidth="5" strokeLinecap="round" />
      <path d="M-17 6 V34 M15 6 V42" stroke="#cbd2d5" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M-29 0 V-15 Q-29 -39 0 -43 Q29 -39 29 -15 V0 Z" fill={ledColor} stroke={DARK} strokeWidth="4" />
      <ellipse cx="-8" cy="-24" rx="7" ry="11" fill={LIGHT} opacity=".48" />
      <rect x="-32" y="-4" width="64" height="10" rx="4" fill="#bfc7cc" stroke={DARK} strokeWidth="3" />
    </g>
  )
}
