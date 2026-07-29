import type { RobotBase, RobotItem, RobotPose, RobotView } from "@/lib/types"

export type ArmAngles = { left: [number, number]; right: [number, number] }

/**
 * 2D / 3D 共通のロボット部品レジストリ。
 * Supabase には従来どおり base / pose / item / view のキーだけを保存し、
 * 各キーから 2D と 3D の表現をここで同時に引けるようにしています。
 *
 * 将来 SVG パーツや glTF/GLB モデルへ置き換える場合も、同じキーに対する
 * twoD / threeD の定義を差し替えれば保存済みロボットとの互換性を保てます。
 */
export const ROBOT_BASE_PARTS: Record<
  RobotBase,
  {
    id: string
    label: string
    sub: string
    defaultName: string
    twoD: { bodyWidth: number; headWidth: number; waist: "bolt" | "nut" }
    threeD: { hipX: number; kneeX: number; ankleX: number; waist: "bolt" | "nut" }
  }
> = {
  volta: {
    id: "base-volta",
    label: "ボルタ",
    sub: "細いボルト脚のタイプ",
    defaultName: "ボルタ",
    twoD: { bodyWidth: 44, headWidth: 90, waist: "bolt" },
    threeD: { hipX: 0.25, kneeX: 0.43, ankleX: 0.58, waist: "bolt" },
  },
  natty: {
    id: "base-natty",
    label: "ナッティ",
    sub: "大きなナット腰のタイプ",
    defaultName: "ナッティ",
    twoD: { bodyWidth: 44, headWidth: 90, waist: "nut" },
    threeD: { hipX: 0.34, kneeX: 0.48, ankleX: 0.62, waist: "nut" },
  },
}

export const ROBOT_POSE_PARTS: Record<
  RobotPose,
  {
    id: string
    label: string
    twoD: { left: string; right: string }
    threeD: Record<RobotBase, ArmAngles>
  }
> = {
  stand: {
    id: "pose-stand",
    label: "きをつけ",
    twoD: {
      left: "M116 104 L92 139 L79 177",
      right: "M184 104 L208 139 L221 177",
    },
    threeD: {
      volta: { left: [-132, -112], right: [-48, -68] },
      natty: { left: [-126, -106], right: [-54, -74] },
    },
  },
  wave: {
    id: "pose-wave",
    label: "おて振り",
    twoD: {
      left: "M116 104 L92 139 L79 177",
      right: "M184 104 L213 82 L222 48",
    },
    threeD: {
      volta: { left: [-132, -112], right: [56, 102] },
      natty: { left: [-126, -106], right: [62, 108] },
    },
  },
  cheer: {
    id: "pose-cheer",
    label: "ばんざい",
    twoD: {
      left: "M116 104 L87 82 L78 48",
      right: "M184 104 L213 82 L222 48",
    },
    threeD: {
      volta: { left: [126, 101], right: [54, 79] },
      natty: { left: [120, 96], right: [60, 84] },
    },
  },
  point: {
    id: "pose-point",
    label: "ゆびさし",
    twoD: {
      left: "M116 104 L92 139 L79 177",
      right: "M184 104 L224 104 L267 100",
    },
    threeD: {
      volta: { left: [-132, -112], right: [8, -2] },
      natty: { left: [-126, -106], right: [12, 2] },
    },
  },
}

export const ROBOT_ITEM_PARTS: Record<RobotItem, { id: string; label: string }> = {
  none: { id: "item-none", label: "なし" },
  wrench: { id: "item-wrench", label: "スパナ" },
  gear: { id: "item-gear", label: "歯車" },
  flower: { id: "item-flower", label: "お花" },
  heart: { id: "item-heart", label: "ハート" },
}

export const ROBOT_VIEW_PARTS: Record<RobotView, { id: string; label: string; yaw: number }> = {
  front: { id: "view-front", label: "正面", yaw: 0 },
  side: { id: "view-side", label: "側面", yaw: -Math.PI / 2 },
  back: { id: "view-back", label: "背面", yaw: Math.PI },
}

export const ROBOT_BASE_OPTIONS = (Object.keys(ROBOT_BASE_PARTS) as RobotBase[]).map((value) => ({
  value,
  label: ROBOT_BASE_PARTS[value].label,
  sub: ROBOT_BASE_PARTS[value].sub,
}))

export const ROBOT_POSE_OPTIONS = (Object.keys(ROBOT_POSE_PARTS) as RobotPose[]).map((value) => ({
  value,
  label: ROBOT_POSE_PARTS[value].label,
}))

export const ROBOT_ITEM_OPTIONS = (Object.keys(ROBOT_ITEM_PARTS) as RobotItem[]).map((value) => ({
  value,
  label: ROBOT_ITEM_PARTS[value].label,
}))

export const ROBOT_VIEW_OPTIONS = (Object.keys(ROBOT_VIEW_PARTS) as RobotView[]).map((value) => ({
  value,
  label: ROBOT_VIEW_PARTS[value].label,
}))
