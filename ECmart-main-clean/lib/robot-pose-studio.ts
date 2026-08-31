import type { RobotConfig } from "@/lib/types"

export const ROBOT_POSE_STUDIO_DRAFT_KEY = "machinowa:robot-pose-studio-draft"

export interface RobotPoseStudioDraft {
  config: RobotConfig
  originalConfig?: RobotConfig
  editingRobotId?: string | null
}
