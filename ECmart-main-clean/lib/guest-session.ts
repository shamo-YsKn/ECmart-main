"use client"

import type { RobotConfig, SavedRobot } from "@/lib/types"
import type { DioramaDocument } from "@/lib/creation-model"
import { normalizeRobotConfig } from "@/lib/robot-config"
import { normalizeDioramaDocument } from "@/lib/diorama-model"

export const GUEST_ROBOT_DRAFT_KEY = "machinowa:guest-robot-draft:v1"
export const GUEST_DIORAMA_DRAFT_KEY = "machinowa:guest-diorama-draft:v1"
const GUEST_USER_ID = "00000000-0000-0000-0000-000000000000"

export interface GuestRobotDraft {
  id: string
  config: RobotConfig
  updatedAt: string
}

export interface GuestDioramaDraft {
  id: string
  document: DioramaDocument
  updatedAt: string
}

function uuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    const value = character === "x" ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function readJson(key: string) {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) as unknown : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Restricted/private browser modes can disable sessionStorage.
  }
}

export function readGuestRobotDraft(): GuestRobotDraft | null {
  const value = readJson(GUEST_ROBOT_DRAFT_KEY)
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  const id = isUuid(input.id) ? input.id : uuid()
  const config = normalizeRobotConfig(input.config)
  return {
    id,
    config,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date().toISOString(),
  }
}

export function writeGuestRobotDraft(config: RobotConfig, existingId?: string): GuestRobotDraft {
  const draft: GuestRobotDraft = {
    id: isUuid(existingId) ? existingId : readGuestRobotDraft()?.id ?? uuid(),
    config: normalizeRobotConfig(config),
    updatedAt: new Date().toISOString(),
  }
  writeJson(GUEST_ROBOT_DRAFT_KEY, draft)
  return draft
}

export function guestRobotAsSavedRobot(draft: GuestRobotDraft): SavedRobot {
  return {
    id: draft.id,
    user_id: GUEST_USER_ID,
    name: draft.config.name,
    config: draft.config,
    is_avatar: false,
    created_at: draft.updatedAt,
    updated_at: draft.updatedAt,
  }
}

export function readGuestDioramaDraft(): GuestDioramaDraft | null {
  const value = readJson(GUEST_DIORAMA_DRAFT_KEY)
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  return {
    id: isUuid(input.id) ? input.id : uuid(),
    document: normalizeDioramaDocument(input.document),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date().toISOString(),
  }
}

export function writeGuestDioramaDraft(document: DioramaDocument, existingId?: string): GuestDioramaDraft {
  const draft: GuestDioramaDraft = {
    id: isUuid(existingId) ? existingId : readGuestDioramaDraft()?.id ?? uuid(),
    document: normalizeDioramaDocument(document),
    updatedAt: new Date().toISOString(),
  }
  writeJson(GUEST_DIORAMA_DRAFT_KEY, draft)
  return draft
}

export function clearGuestWorkspaceStorage() {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(GUEST_ROBOT_DRAFT_KEY)
    window.sessionStorage.removeItem(GUEST_DIORAMA_DRAFT_KEY)
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function clearGuestDioramaDraftStorage() {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(GUEST_DIORAMA_DRAFT_KEY)
  } catch {
    // Ignore storage cleanup failures.
  }
}
