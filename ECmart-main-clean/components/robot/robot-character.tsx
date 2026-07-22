"use client"

import dynamic from "next/dynamic"
import type { RobotConfig } from "@/lib/types"
import { cn } from "@/lib/utils"

const RobotCanvas = dynamic(
  () => import("./robot-canvas").then((module) => module.RobotCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
        <div className="h-2/3 w-1/3 animate-pulse rounded-[35%] border-4 border-foreground/15 bg-gradient-to-br from-white/80 to-foreground/10 shadow-xl" />
      </div>
    ),
  },
)

export function RobotCharacter({
  config,
  className,
  interactive = false,
}: {
  config: RobotConfig
  className?: string
  interactive?: boolean
}) {
  const name = config.name || (config.base === "volta" ? "ボルタ" : "ナッティ")

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      aria-label={`${name}の3Dプレビュー`}
      role="img"
    >
      <RobotCanvas config={config} interactive={interactive} />
      {interactive && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-2">
          <span className="rounded-full border border-white/60 bg-background/80 px-3 py-1 text-[11px] font-bold text-foreground/70 shadow-sm backdrop-blur-sm">
            ドラッグ・スワイプで回転／ホイール・ピンチで拡大
          </span>
        </div>
      )}
    </div>
  )
}
