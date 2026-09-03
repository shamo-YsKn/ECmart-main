"use client"

import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react"
import type { DioramaDocument } from "@/lib/creation-model"
import type { SavedRobot } from "@/lib/types"
import type { SavedCustomItem } from "@/lib/custom-item-model"
import { stageIdFromReference } from "@/lib/diorama-model"
import { normalizeRobotHeldItem } from "@/lib/robot-held-item"
import { RobotCharacter } from "@/components/robot/robot-character"
import { CustomItemArtwork, getCustomItemBounds } from "@/components/workbench/custom-item-preview"
import { DioramaStagePreview } from "./diorama-stage-preview"
import { cn } from "@/lib/utils"

export type DioramaSelection = { kind: "robot" | "item"; placementId: string }

function transformStyle(position: [number, number, number], rotation: [number, number, number], scale: [number, number, number]): CSSProperties {
  return {
    left: `${((position[0] + 320) / 640) * 100}%`,
    top: `${((position[1] + 180) / 360) * 100}%`,
    zIndex: Math.max(1, Math.round(position[2])),
    transform: `translate(-50%, -50%) rotate(${rotation[2]}deg) scale(${scale[0]})`,
    transformOrigin: "center center",
  }
}

function RobotAsset({ robot, customItems, view = "front" }: { robot: SavedRobot; customItems: SavedCustomItem[]; view?: "front" | "side" | "back" }) {
  const held = normalizeRobotHeldItem(robot.config.heldItem, robot.config.item)
  const customDocument = held.kind === "custom"
    ? customItems.find((item) => item.id === held.customItemId)?.document ?? null
    : null
  return <RobotCharacter config={{ ...robot.config, view }} customItemDocument={customDocument} className="h-full w-full" />
}

function ItemAsset({ item }: { item: SavedCustomItem }) {
  const bounds = getCustomItemBounds(item.document)
  const padding = 22
  return (
    <svg
      viewBox={`${bounds.minX - padding} ${bounds.minY - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}`}
      className="h-full w-full overflow-visible"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <CustomItemArtwork document={item.document} />
    </svg>
  )
}

function MissingAsset({ children }: { children: ReactNode }) {
  return <div className="flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-red-300 bg-white/80 px-2 text-center text-[10px] font-bold text-red-700">{children}</div>
}

export function DioramaScenePreview({
  document,
  robots,
  customItems,
  className,
  selected,
  onSelect,
  onPointerDown,
}: {
  document: DioramaDocument
  robots: SavedRobot[]
  customItems: SavedCustomItem[]
  className?: string
  selected?: DioramaSelection | null
  onSelect?: (selection: DioramaSelection | null) => void
  onPointerDown?: (selection: DioramaSelection, event: ReactPointerEvent<HTMLButtonElement>) => void
}) {
  const stageId = stageIdFromReference(document.stage)
  const interactive = Boolean(onSelect || onPointerDown)

  return (
    <div
      className={cn("relative aspect-video overflow-hidden rounded-2xl border-2 bg-muted shadow-inner", className)}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onSelect?.(null)
      }}
    >
      <DioramaStagePreview stageId={stageId} showLabel={false} className="pointer-events-none absolute inset-0 h-full w-full rounded-none" />

      {document.robots.map((placement) => {
        const robot = robots.find((entry) => entry.id === placement.savedRobotId)
        const isSelected = selected?.kind === "robot" && selected.placementId === placement.placementId
        return (
          <button
            key={placement.placementId}
            type="button"
            className={cn(
              "absolute h-[42%] w-[24%] touch-none select-none rounded-xl outline-none",
              interactive && "cursor-grab active:cursor-grabbing",
              isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-transparent",
            )}
            style={transformStyle(placement.transform.position, placement.transform.rotationDeg, placement.transform.scale)}
            onClick={(event) => { event.stopPropagation(); onSelect?.({ kind: "robot", placementId: placement.placementId }) }}
            onPointerDown={(event) => onPointerDown?.({ kind: "robot", placementId: placement.placementId }, event)}
            aria-label={robot ? `${robot.name}を選択` : "見つからないロボット"}
          >
            {robot ? <RobotAsset robot={robot} customItems={customItems} view={placement.view} /> : <MissingAsset>ロボットが見つかりません</MissingAsset>}
          </button>
        )
      })}

      {document.items.map((placement) => {
        const item = customItems.find((entry) => entry.id === placement.customItemId)
        const isSelected = selected?.kind === "item" && selected.placementId === placement.placementId
        return (
          <button
            key={placement.placementId}
            type="button"
            className={cn(
              "absolute h-[25%] w-[18%] touch-none select-none rounded-xl outline-none",
              interactive && "cursor-grab active:cursor-grabbing",
              isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-transparent",
            )}
            style={transformStyle(placement.transform.position, placement.transform.rotationDeg, placement.transform.scale)}
            onClick={(event) => { event.stopPropagation(); onSelect?.({ kind: "item", placementId: placement.placementId }) }}
            onPointerDown={(event) => onPointerDown?.({ kind: "item", placementId: placement.placementId }, event)}
            aria-label={item ? `${item.name}を選択` : "見つからない自作アイテム"}
          >
            {item ? <ItemAsset item={item} /> : <MissingAsset>アイテムが見つかりません</MissingAsset>}
          </button>
        )
      })}
    </div>
  )
}
