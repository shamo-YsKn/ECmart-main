"use client"

import type { CustomItemDocument, CustomItemView } from "@/lib/creation-model"
import { customItemViewLabel, itemPartsForView, itemViewTransform, projectItemPosition } from "@/lib/custom-item-view"
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

export function getCustomItemBounds(document: CustomItemDocument, view: CustomItemView = "front"): CustomItemBounds {
  if (document.parts.length === 0) {
    return { minX: -50, minY: -50, maxX: 50, maxY: 50, centerX: 0, centerY: 0, width: 100, height: 100 }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const part of document.parts) {
    // パーツ固有の形状差と回転を含めて余白を確保。旧frontの計算値も維持します。
    const radius = 82 * part.transform.scale[0]
    const point = projectItemPosition(part.transform.position, view)
    minX = Math.min(minX, point.x - radius)
    minY = Math.min(minY, point.y - radius)
    maxX = Math.max(maxX, point.x + radius)
    maxY = Math.max(maxY, point.y + radius)
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

export function CustomItemArtwork({ document, view = "front", reverseDepth = false }: { document: CustomItemDocument; view?: CustomItemView; reverseDepth?: boolean }) {
  return (
    <>
      {itemPartsForView(document.parts, view, reverseDepth).map(({ part }) => (
        <g key={part.instanceId} transform={itemViewTransform(part, view)}>
          <WorkbenchPartShape type={part.partType} variantId={part.variantId} view={view} />
        </g>
      ))}
    </>
  )
}

export function CustomItemPreview({
  document,
  className,
  showGrid = false,
  view = "front",
}: {
  document: CustomItemDocument
  className?: string
  showGrid?: boolean
  view?: CustomItemView
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-[#f4ead6]", className)}>
      <svg viewBox="-300 -220 600 440" className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-label={`${document.name}の${customItemViewLabel(view)}プレビュー`} role="img">
        {showGrid && (
          <g stroke="#7c6851" strokeOpacity=".12" strokeWidth="1">
            {Array.from({ length: 13 }, (_, i) => <line key={`v-${i}`} x1={-300 + i * 50} y1="-220" x2={-300 + i * 50} y2="220" />)}
            {Array.from({ length: 9 }, (_, i) => <line key={`h-${i}`} x1="-300" y1={-200 + i * 50} x2="300" y2={-200 + i * 50} />)}
          </g>
        )}
        <line x1="-280" y1="0" x2="280" y2="0" stroke="#7c6851" strokeOpacity=".16" strokeDasharray="6 8" />
        <line x1="0" y1="-205" x2="0" y2="205" stroke="#7c6851" strokeOpacity=".16" strokeDasharray="6 8" />
        <CustomItemArtwork document={document} view={view} />
      </svg>
    </div>
  )
}
