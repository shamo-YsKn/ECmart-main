import type { WorkbenchPartType } from "@/lib/creation-model"

export interface WorkbenchSocketDefinition {
  id: string
  label: string
  x: number
  y: number
}

export interface WorkbenchPartDefinition {
  type: WorkbenchPartType
  label: string
  shortLabel: string
  category: "金属部品" | "線材" | "LED"
  description: string
  sockets: WorkbenchSocketDefinition[]
}

const CROSS = [
  { id: "left", label: "左", x: -42, y: 0 },
  { id: "right", label: "右", x: 42, y: 0 },
  { id: "top", label: "上", x: 0, y: -42 },
  { id: "bottom", label: "下", x: 0, y: 42 },
]

export const WORKBENCH_PARTS: WorkbenchPartDefinition[] = [
  { type: "hex_nut", label: "六角ナット", shortLabel: "ナット", category: "金属部品", description: "ボルタらしい基本パーツ。中心に穴があります。", sockets: [{ id: "center", label: "中央", x: 0, y: 0 }, ...CROSS] },
  { type: "washer", label: "ワッシャー", shortLabel: "座金", category: "金属部品", description: "薄い円形の金属パーツです。", sockets: [{ id: "center", label: "中央", x: 0, y: 0 }, ...CROSS] },
  { type: "bolt", label: "ボルト", shortLabel: "ボルト", category: "金属部品", description: "六角頭とねじ軸を持つ基本部品です。", sockets: [
    { id: "head", label: "頭", x: -38, y: 0 },
    { id: "shaft", label: "軸端", x: 63, y: 0 },
    { id: "center", label: "中央", x: 8, y: 0 },
  ] },
  { type: "flat_head_screw", label: "皿ねじ", shortLabel: "皿ねじ", category: "金属部品", description: "広がった頭を持つねじです。", sockets: [
    { id: "head", label: "頭", x: -25, y: 0 },
    { id: "shaft", label: "軸端", x: 67, y: 0 },
  ] },
  { type: "pan_head_screw", label: "なべねじ", shortLabel: "なべねじ", category: "金属部品", description: "丸みのある頭を持つねじです。", sockets: [
    { id: "head", label: "頭", x: -20, y: 0 },
    { id: "shaft", label: "軸端", x: 67, y: 0 },
  ] },
  { type: "metal_rod", label: "金属棒", shortLabel: "金属棒", category: "線材", description: "アイテムの軸や持ち手に使えます。", sockets: [
    { id: "start", label: "左端", x: -64, y: 0 },
    { id: "center", label: "中央", x: 0, y: 0 },
    { id: "end", label: "右端", x: 64, y: 0 },
  ] },
  { type: "wire", label: "針金", shortLabel: "針金", category: "線材", description: "細い曲線風のパーツです。", sockets: [
    { id: "start", label: "始点", x: -61, y: 23 },
    { id: "center", label: "中央", x: 0, y: 0 },
    { id: "end", label: "終点", x: 61, y: -19 },
  ] },
  { type: "spring", label: "ばね", shortLabel: "ばね", category: "線材", description: "ボルタ・ナッティらしいコイル状パーツです。", sockets: [
    { id: "start", label: "左端", x: -65, y: 0 },
    { id: "center", label: "中央", x: 0, y: 0 },
    { id: "end", label: "右端", x: 65, y: 0 },
  ] },
  { type: "led_red", label: "赤LED", shortLabel: "赤LED", category: "LED", description: "赤く光るLEDパーツです。", sockets: [
    { id: "lead-left", label: "左リード", x: -16, y: 35 },
    { id: "lead-right", label: "右リード", x: 16, y: 43 },
    { id: "top", label: "先端", x: 0, y: -43 },
  ] },
  { type: "led_green", label: "緑LED", shortLabel: "緑LED", category: "LED", description: "緑に光るLEDパーツです。", sockets: [
    { id: "lead-left", label: "左リード", x: -16, y: 35 },
    { id: "lead-right", label: "右リード", x: 16, y: 43 },
    { id: "top", label: "先端", x: 0, y: -43 },
  ] },
  { type: "led_yellow", label: "黄LED", shortLabel: "黄LED", category: "LED", description: "黄色く光るLEDパーツです。", sockets: [
    { id: "lead-left", label: "左リード", x: -16, y: 35 },
    { id: "lead-right", label: "右リード", x: 16, y: 43 },
    { id: "top", label: "先端", x: 0, y: -43 },
  ] },
]

export const WORKBENCH_PART_BY_TYPE = Object.fromEntries(
  WORKBENCH_PARTS.map((part) => [part.type, part]),
) as Record<WorkbenchPartType, WorkbenchPartDefinition>

export function getWorkbenchSocket(type: WorkbenchPartType, socketId: string) {
  return WORKBENCH_PART_BY_TYPE[type].sockets.find((socket) => socket.id === socketId) ?? null
}
