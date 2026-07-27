"use client"

import type React from "react"
import { cn } from "@/lib/utils"

type SliderProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> & {
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
}

function Slider({ className, value, defaultValue, min = 0, max = 100, step = 1, onValueChange, ...props }: SliderProps) {
  const current = value?.[0]
  const initial = defaultValue?.[0]
  return (
    <input
      {...props}
      type="range"
      min={min}
      max={max}
      step={step}
      value={current}
      defaultValue={current === undefined ? initial : undefined}
      onChange={(event) => onValueChange?.([Number(event.currentTarget.value)])}
      className={cn("h-8 w-full cursor-pointer accent-primary", className)}
      data-slot="slider"
    />
  )
}

export { Slider }
