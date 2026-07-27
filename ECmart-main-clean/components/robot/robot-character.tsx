"use client"

import dynamic from "next/dynamic"
import {
  Component,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react"
import type { RobotConfig } from "@/lib/types"
import { cn } from "@/lib/utils"
import { RobotFallback } from "./robot-fallback"

const RobotCanvas = dynamic(
  () => import("./robot-canvas").then((module) => module.RobotCanvas),
  {
    ssr: false,
    loading: () => null,
  },
)

class Robot3DErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("3D robot preview failed; using 2D fallback.", error, info)
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function canUseWebGL2() {
  try {
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      failIfMajorPerformanceCaveat: false,
    })

    if (!context) return false

    context.getExtension("WEBGL_lose_context")?.loseContext()
    return true
  } catch {
    return false
  }
}

export function RobotCharacter({
  config,
  className,
  interactive = false,
}: {
  config: RobotConfig
  className?: string
  interactive?: boolean
}) {
  const [enable3D, setEnable3D] = useState(false)
  const name = config.name || (config.base === "volta" ? "ボルタ" : "ナッティ")

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    // Always let the page hydrate first. The initial/server representation is a
    // lightweight SVG, so a slow/unsupported GPU cannot block site navigation.
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          if (!cancelled && canUseWebGL2()) setEnable3D(true)
        },
        interactive ? 0 : 180,
      )
    }

    if (typeof window.requestAnimationFrame === "function") {
      const frame = window.requestAnimationFrame(schedule)
      return () => {
        cancelled = true
        window.cancelAnimationFrame(frame)
        if (timer !== undefined) window.clearTimeout(timer)
      }
    }

    schedule()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [interactive])

  const fallback = <RobotFallback config={config} />

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      aria-label={`${name}のロボットプレビュー`}
      role="img"
    >
      {enable3D ? (
        <Robot3DErrorBoundary fallback={fallback}>
          <RobotCanvas config={config} interactive={interactive} />
        </Robot3DErrorBoundary>
      ) : (
        fallback
      )}

      {interactive && enable3D && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-2">
          <span className="rounded-full border border-white/60 bg-background/80 px-3 py-1 text-[11px] font-bold text-foreground/70 shadow-sm backdrop-blur-sm">
            ドラッグ・スワイプで回転／ホイール・ピンチで拡大
          </span>
        </div>
      )}
    </div>
  )
}
