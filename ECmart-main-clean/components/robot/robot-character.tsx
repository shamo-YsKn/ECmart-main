"use client"

import dynamic from "next/dynamic"
import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react"
import type { RobotConfig } from "@/lib/types"
import { cn } from "@/lib/utils"
import { RobotFallback } from "./robot-fallback"

export type RobotRenderMode = "2d" | "3d"

const RobotCanvas = dynamic(
  () => import("./robot-canvas").then((module) => module.RobotCanvas),
  {
    ssr: false,
    loading: () => null,
  },
)

class Robot3DErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onFailure?: () => void },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onFailure?.()
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
  mode = "2d",
  on3DUnavailable,
}: {
  config: RobotConfig
  className?: string
  interactive?: boolean
  mode?: RobotRenderMode
  on3DUnavailable?: () => void
}) {
  const [webGLReady, setWebGLReady] = useState(false)
  const name = config.name || (config.base === "volta" ? "ボルタ" : "ナッティ")

  useEffect(() => {
    if (mode !== "3d") {
      setWebGLReady(false)
      return
    }

    const ok = canUseWebGL2()
    setWebGLReady(ok)
    if (!ok) on3DUnavailable?.()
  }, [mode, on3DUnavailable])

  const fallback = <RobotFallback config={config} />
  const show3D = mode === "3d" && webGLReady

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      aria-label={`${name}のロボットプレビュー`}
      role="img"
    >
      {show3D ? (
        <Robot3DErrorBoundary fallback={fallback} onFailure={on3DUnavailable}>
          <RobotCanvas config={config} interactive={interactive} />
        </Robot3DErrorBoundary>
      ) : (
        fallback
      )}

      {interactive && show3D && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-2">
          <span className="rounded-full border border-white/60 bg-background/80 px-3 py-1 text-[11px] font-bold text-foreground/70 shadow-sm backdrop-blur-sm">
            ドラッグで360度回転／ホイールで拡大縮小
          </span>
        </div>
      )}
    </div>
  )
}
