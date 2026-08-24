"use client"

import type { CustomItemDocument } from "@/lib/creation-model"
import { WorkbenchPartShape } from "./workbench-part-shape"
import { cn } from "@/lib/utils"

export interface CustomItemBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  centerX: number
  centerY: number
  width: number
  height: number
}

export function getCustomItemBounds(document: CustomItemDocument): CustomItemBounds {
  if (document.parts.length === 0) {
    return { minX: -50, minY: -50, maxX: 50, maxY: 50, centerX: 0, centerY: 0, width: 100, height: 100 }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const part of document.parts) {
    // 各基本パーツはおよそ140×120以内。回転も考慮して余裕を持たせます。
    const radius = 82 * part.transform.scale[0]
    const x = part.transform.position[0]
    const y = part.transform.position[1]
    minX = Math.min(minX, x - radius)
    minY = Math.min(minY, y - radius)
    maxX = Math.max(maxX, x + radius)
    maxY = Math.max(maxY, y + radius)
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

export function CustomItemArtwork({ document }: { document: CustomItemDocument }) {
  return (
    <>
      {document.parts.map((part) => (
        <g
          key={part.instanceId}
          transform={`translate(${part.transform.position[0]} ${part.transform.position[1]}) rotate(${part.transform.rotationDeg[2]}) scale(${part.transform.scale[0]})`}
        >
          <WorkbenchPartShape type={part.partType} />
        </g>
      ))}
    </>
  )
}

export function CustomItemPreview({
  document,
  className,
  showGrid = false,
}: {
  document: CustomItemDocument
  className?: string
  showGrid?: boolean
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-[#f4ead6]", className)}>
      <svg viewBox="-300 -220 600 440" className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-label={`${document.name}の工作アイテムプレビュー`} role="img">
        {showGrid && (
          <g stroke="#7c6851" strokeOpacity=".12" strokeWidth="1">
            {Array.from({ length: 13 }, (_, i) => <line key={`v-${i}`} x1={-300 + i * 50} y1="-220" x2={-300 + i * 50} y2="220" />)}
            {Array.from({ length: 9 }, (_, i) => <line key={`h-${i}`} x1="-300" y1={-200 + i * 50} x2="300" y2={-200 + i * 50} />)}
          </g>
        )}
        <line x1="-280" y1="0" x2="280" y2="0" stroke="#7c6851" strokeOpacity=".16" strokeDasharray="6 8" />
        <line x1="0" y1="-205" x2="0" y2="205" stroke="#7c6851" strokeOpacity=".16" strokeDasharray="6 8" />
        <CustomItemArtwork document={document} />
      </svg>
    </div>
  )
}
