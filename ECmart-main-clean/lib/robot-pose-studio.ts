import type { RobotConfig } from "@/lib/types"

export const ROBOT_POSE_STUDIO_DRAFT_KEY = "machinowa:robot-pose-studio-draft"
const ROBOT_POSE_STUDIO_FALLBACK_KEY = `${ROBOT_POSE_STUDIO_DRAFT_KEY}:fallback`

export interface RobotPoseStudioDraft {
  config: RobotConfig
  originalConfig?: RobotConfig
  editingRobotId?: string | null
}

function storageCandidates() {
  if (typeof window === "undefined") return [] as Storage[]
  const stores: Storage[] = []
  try { stores.push(window.sessionStorage) } catch {}
  try { stores.push(window.localStorage) } catch {}
  return stores
}

export function saveRobotPoseStudioDraft(draft: RobotPoseStudioDraft) {
  const serialized = JSON.stringify(draft)
  const stores = storageCandidates()
  for (let index = 0; index < stores.length; index += 1) {
    try {
      stores[index].setItem(index === 0 ? ROBOT_POSE_STUDIO_DRAFT_KEY : ROBOT_POSE_STUDIO_FALLBACK_KEY, serialized)
      return true
    } catch {}
  }
  return false
}

export function loadRobotPoseStudioDraft() {
  for (const storage of storageCandidates()) {
    for (const key of [ROBOT_POSE_STUDIO_DRAFT_KEY, ROBOT_POSE_STUDIO_FALLBACK_KEY]) {
      try {
        const raw = storage.getItem(key)
        if (raw) return raw
      } catch {}
    }
  }
  return null
}

export function clearRobotPoseStudioDraft() {
  for (const storage of storageCandidates()) {
    for (const key of [ROBOT_POSE_STUDIO_DRAFT_KEY, ROBOT_POSE_STUDIO_FALLBACK_KEY]) {
      try { storage.removeItem(key) } catch {}
    }
  }
}
