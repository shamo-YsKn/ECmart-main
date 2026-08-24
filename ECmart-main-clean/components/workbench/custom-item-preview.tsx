"use client"

import type { CustomItemDocument } from "@/lib/creation-model"
import { WorkbenchPartShape } from "./workbench-part-shape"
import { cn } from "@/lib/utils"

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
        {document.parts.map((part) => (
          <g
            key={part.instanceId}
            transform={`translate(${part.transform.position[0]} ${part.transform.position[1]}) rotate(${part.transform.rotationDeg[2]}) scale(${part.transform.scale[0]})`}
          >
            <WorkbenchPartShape type={part.partType} />
          </g>
        ))}
      </svg>
    </div>
  )
}
