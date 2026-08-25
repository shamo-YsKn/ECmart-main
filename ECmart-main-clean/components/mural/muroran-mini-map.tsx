"use client"

import type { MuroranSpot } from "@/lib/mural-spots"
import { MURORAN_SPOTS } from "@/lib/mural-spots"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function MuroranMiniMap({
  selectedSpotId,
  counts,
  onSelect,
}: {
  selectedSpotId: string
  counts: Record<string, number>
  onSelect: (spot: MuroranSpot) => void
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 bg-[#d9edf0] shadow-sm">
      <svg viewBox="0 0 1000 620" className="block aspect-[16/10] w-full" aria-label="室蘭デフォルメマップ" role="img">
        <defs>
          <linearGradient id="muroran-map-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d8edf0" />
            <stop offset="1" stopColor="#b8d8dd" />
          </linearGradient>
          <linearGradient id="muroran-map-land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d9d4b7" />
            <stop offset="1" stopColor="#b6c7a2" />
          </linearGradient>
        </defs>
        <rect width="1000" height="620" fill="url(#muroran-map-sea)" />
        <path d="M52 178 C170 104 286 110 382 148 C476 185 541 143 651 114 C762 85 876 115 950 180 C893 222 850 258 843 312 C833 384 903 438 850 506 C774 565 650 550 558 513 C476 480 388 506 298 529 C205 553 120 518 86 452 C52 385 106 332 142 286 C180 237 121 211 52 178 Z" fill="url(#muroran-map-land)" stroke="#6f806f" strokeWidth="8" />
        <path d="M104 241 C246 212 322 274 422 247 C536 216 612 149 770 155" fill="none" stroke="#f6f2df" strokeWidth="10" strokeLinecap="round" opacity=".9" />
        <path d="M188 430 C338 379 471 410 602 356 C706 314 790 340 860 389" fill="none" stroke="#e8dfc8" strokeWidth="8" strokeLinecap="round" opacity=".85" />
        <path d="M175 200 C220 147 291 114 346 92" fill="none" stroke="#7393a0" strokeWidth="5" strokeDasharray="14 14" opacity=".45" />
        <text x="57" y="570" fontSize="24" fill="#49656e" fontWeight="700">※位置関係を楽しむためのデフォルメマップです</text>
      </svg>

      {MURORAN_SPOTS.map((spot) => {
        const selected = spot.id === selectedSpotId
        const count = counts[spot.id] ?? 0
        return (
          <button
            key={spot.id}
            type="button"
            onClick={() => onSelect(spot)}
            className={cn(
              "group absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 px-2.5 py-1.5 text-xs font-black shadow-md transition hover:z-20 hover:scale-110 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
              selected ? "z-10 border-primary bg-primary text-primary-foreground" : "border-white bg-background/95 text-foreground",
            )}
            style={{ left: `${spot.mapPosition.x}%`, top: `${spot.mapPosition.y}%` }}
            aria-label={`${spot.name}の壁画を見る`}
          >
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span>{spot.emoji}</span>
              <span className="hidden sm:inline">{spot.shortName}</span>
              {count > 0 && <Badge variant={selected ? "secondary" : "outline"} className="h-5 rounded-full px-1.5 text-[10px]">{count}</Badge>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
