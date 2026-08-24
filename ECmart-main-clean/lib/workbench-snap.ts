import type { CustomItemPartPlacement } from "@/lib/creation-model"
import { getWorkbenchSocket, WORKBENCH_PART_BY_TYPE, type WorkbenchSocketDefinition } from "@/lib/workbench-parts"

export interface WorkbenchPoint {
  x: number
  y: number
}

export interface SnapCandidate {
  movingSocketId: string
  targetInstanceId: string
  targetSocketId: string
  targetPoint: WorkbenchPoint
  distance: number
}

function rad(deg: number) {
  return (deg * Math.PI) / 180
}

export function localSocketToWorld(part: CustomItemPartPlacement, socket: WorkbenchSocketDefinition): WorkbenchPoint {
  const angle = rad(part.transform.rotationDeg[2])
  const scale = part.transform.scale[0]
  const sx = socket.x * scale
  const sy = socket.y * scale
  return {
    x: part.transform.position[0] + sx * Math.cos(angle) - sy * Math.sin(angle),
    y: part.transform.position[1] + sx * Math.sin(angle) + sy * Math.cos(angle),
  }
}

export function socketWorldPoint(part: CustomItemPartPlacement, socketId: string) {
  const socket = getWorkbenchSocket(part.partType, socketId)
  return socket ? localSocketToWorld(part, socket) : null
}

export function alignPartSocketToPoint(part: CustomItemPartPlacement, ownSocketId: string, point: WorkbenchPoint): CustomItemPartPlacement {
  const socket = getWorkbenchSocket(part.partType, ownSocketId)
  if (!socket) return part
  const angle = rad(part.transform.rotationDeg[2])
  const scale = part.transform.scale[0]
  const sx = socket.x * scale
  const sy = socket.y * scale
  const offsetX = sx * Math.cos(angle) - sy * Math.sin(angle)
  const offsetY = sx * Math.sin(angle) + sy * Math.cos(angle)
  return {
    ...part,
    transform: {
      ...part.transform,
      position: [point.x - offsetX, point.y - offsetY, part.transform.position[2]],
    },
  }
}

export function findSnapCandidate(
  moving: CustomItemPartPlacement,
  parts: CustomItemPartPlacement[],
  threshold = 24,
  excludeIds: Set<string> = new Set(),
): SnapCandidate | null {
  let best: SnapCandidate | null = null
  const movingSockets = WORKBENCH_PART_BY_TYPE[moving.partType].sockets

  for (const ownSocket of movingSockets) {
    const ownPoint = localSocketToWorld(moving, ownSocket)
    for (const target of parts) {
      if (target.instanceId === moving.instanceId || excludeIds.has(target.instanceId)) continue
      for (const targetSocket of WORKBENCH_PART_BY_TYPE[target.partType].sockets) {
        const targetPoint = localSocketToWorld(target, targetSocket)
        const distance = Math.hypot(targetPoint.x - ownPoint.x, targetPoint.y - ownPoint.y)
        if (distance <= threshold && (!best || distance < best.distance)) {
          best = {
            movingSocketId: ownSocket.id,
            targetInstanceId: target.instanceId,
            targetSocketId: targetSocket.id,
            targetPoint,
            distance,
          }
        }
      }
    }
  }
  return best
}


export function collectPartTreeIds(parts: CustomItemPartPlacement[], rootId: string) {
  const ids = new Set<string>([rootId])
  const queue = [rootId]
  while (queue.length) {
    const parentId = queue.shift()!
    for (const child of childrenOf(parts, parentId)) {
      if (!ids.has(child.instanceId)) {
        ids.add(child.instanceId)
        queue.push(child.instanceId)
      }
    }
  }
  return ids
}

function childrenOf(parts: CustomItemPartPlacement[], parentId: string) {
  return parts.filter((part) => part.attachedTo?.instanceId === parentId)
}

/** Parentの移動量を接続済みの子孫へ伝搬します。 */
export function translatePartTree(parts: CustomItemPartPlacement[], rootId: string, dx: number, dy: number) {
  if (!dx && !dy) return parts
  const affected = new Set<string>([rootId])
  const queue = [rootId]
  while (queue.length) {
    const parentId = queue.shift()!
    for (const child of childrenOf(parts, parentId)) {
      if (!affected.has(child.instanceId)) {
        affected.add(child.instanceId)
        queue.push(child.instanceId)
      }
    }
  }
  return parts.map((part) => affected.has(part.instanceId)
    ? {
        ...part,
        transform: {
          ...part.transform,
          position: [part.transform.position[0] + dx, part.transform.position[1] + dy, part.transform.position[2]],
        },
      }
    : part)
}

/** 回転や拡大縮小の後、接続点の位置がずれないよう子パーツを順次再配置します。 */
export function reflowAttachedParts(parts: CustomItemPartPlacement[]) {
  let next: CustomItemPartPlacement[] = parts.map((part) => ({ ...part, transform: { ...part.transform, position: [...part.transform.position] as [number, number, number], rotationDeg: [...part.transform.rotationDeg] as [number, number, number], scale: [...part.transform.scale] as [number, number, number] } }))
  for (let pass = 0; pass < next.length; pass += 1) {
    let changed = false
    next = next.map((part) => {
      const attachment = part.attachedTo
      if (!attachment) return part
      const target = next.find((candidate) => candidate.instanceId === attachment.instanceId)
      if (!target || target.instanceId === part.instanceId) return { ...part, attachedTo: undefined }
      const targetPoint = socketWorldPoint(target, attachment.socketId)
      if (!targetPoint) return { ...part, attachedTo: undefined }
      const aligned = alignPartSocketToPoint(part, attachment.ownSocketId, targetPoint)
      const [ox, oy] = part.transform.position
      const [nx, ny] = aligned.transform.position
      if (Math.abs(ox - nx) > 0.01 || Math.abs(oy - ny) > 0.01) changed = true
      return aligned
    })
    if (!changed) break
  }
  return next
}

export function connectedCount(parts: CustomItemPartPlacement[]) {
  return parts.filter((part) => Boolean(part.attachedTo)).length
}
