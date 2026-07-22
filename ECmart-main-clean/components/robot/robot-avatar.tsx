"use client"

import type { RobotConfig } from "@/lib/types"
import { cn } from "@/lib/utils"
import { UserRound } from "lucide-react"
import { RobotCharacter } from "./robot-character"

export function RobotAvatar({
  config,
  className,
  title = "アカウントアイコン",
}: {
  config?: RobotConfig | null
  className?: string
  title?: string
}) {
  if (!config) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted text-muted-foreground",
          className,
        )}
        aria-label={title}
        role="img"
      >
        <UserRound className="h-1/2 w-1/2" aria-hidden="true" />
      </div>
    )
  }

  const avatarConfig: RobotConfig = {
    ...config,
    size: 90,
    view: "front",
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border-2 border-primary/30 bg-[radial-gradient(circle_at_50%_38%,var(--color-secondary),var(--color-muted))]",
        className,
      )}
      aria-label={`${config.name || "ロボット"}のアカウントアイコン`}
      role="img"
      title={title}
    >
      <div className="absolute -inset-[18%] top-[-10%]">
        <RobotCharacter config={avatarConfig} className="h-full w-full" />
      </div>
    </div>
  )
}
