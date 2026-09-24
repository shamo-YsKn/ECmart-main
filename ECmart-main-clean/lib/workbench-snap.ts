import type { CustomItemPartPlacement, CustomItemView, Vec3 } from "@/lib/creation-model"
import { projectItemPosition } from "@/lib/custom-item-view"
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
  targetWorldPoint: Vec3
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

function rotateVec3([x, y, z]: Vec3, [rxDeg, ryDeg, rzDeg]: Vec3): Vec3 {
  const rx = rad(rxDeg), ry = rad(ryDeg), rz = rad(rzDeg)
  const cx = Math.cos(rx), sx = Math.sin(rx)
  const cy = Math.cos(ry), sy = Math.sin(ry)
  const cz = Math.cos(rz), sz = Math.sin(rz)

  // X -> Y -> Z の順で適用。旧2DデータはZ回転のみなので従来計算と一致します。
  const x1 = x
  const y1 = y * cx - z * sx
  const z1 = y * sx + z * cx
  const x2 = x1 * cy + z1 * sy
  const y2 = y1
  const z2 = -x1 * sy + z1 * cy
  return [x2 * cz - y2 * sz, x2 * sz + y2 * cz, z2]
}

export function localSocketToWorld3D(part: CustomItemPartPlacement, socket: WorkbenchSocketDefinition): Vec3 {
  const scale = part.transform.scale[0]
  const local: Vec3 = [socket.x * scale, socket.y * scale, (socket.z ?? 0) * scale]
  const [dx, dy, dz] = rotateVec3(local, part.transform.rotationDeg)
  return [part.transform.position[0] + dx, part.transform.position[1] + dy, part.transform.position[2] + dz]
}

export function socketWorldPoint(part: CustomItemPartPlacement, socketId: string) {
  const socket = getWorkbenchSocket(part.partType, socketId)
  return socket ? localSocketToWorld(part, socket) : null
}

export function socketWorldPoint3D(part: CustomItemPartPlacement, socketId: string) {
  const socket = getWorkbenchSocket(part.partType, socketId)
  return socket ? localSocketToWorld3D(part, socket) : null
}

export function projectSocketPoint(part: CustomItemPartPlacement, socket: WorkbenchSocketDefinition, view: CustomItemView): WorkbenchPoint {
  const point = projectItemPosition(localSocketToWorld3D(part, socket), view)
  return { x: point.x, y: point.y }
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

export function alignPartSocketToWorldPoint(part: CustomItemPartPlacement, ownSocketId: string, point: Vec3): CustomItemPartPlacement {
  const socket = getWorkbenchSocket(part.partType, ownSocketId)
  if (!socket) return part
  const current = localSocketToWorld3D(part, socket)
  return {
    ...part,
    transform: {
      ...part.transform,
      position: [
        part.transform.position[0] + point[0] - current[0],
        part.transform.position[1] + point[1] - current[1],
        part.transform.position[2] + point[2] - current[2],
      ],
    },
  }
}

export function findSnapCandidate(
  moving: CustomItemPartPlacement,
  parts: CustomItemPartPlacement[],
  threshold = 24,
  excludeIds: Set<string> = new Set(),
  view: CustomItemView = "front",
): SnapCandidate | null {
  let best: SnapCandidate | null = null
  const movingSockets = WORKBENCH_PART_BY_TYPE[moving.partType].sockets

  for (const ownSocket of movingSockets) {
    const ownPoint = projectSocketPoint(moving, ownSocket, view)
    for (const target of parts) {
      if (target.instanceId === moving.instanceId || excludeIds.has(target.instanceId)) continue
      for (const targetSocket of WORKBENCH_PART_BY_TYPE[target.partType].sockets) {
        const targetWorldPoint = localSocketToWorld3D(target, targetSocket)
        const projectedTarget = projectItemPosition(targetWorldPoint, view)
        const targetPoint = { x: projectedTarget.x, y: projectedTarget.y }
        const distance = Math.hypot(targetPoint.x - ownPoint.x, targetPoint.y - ownPoint.y)
        if (distance <= threshold && (!best || distance < best.distance)) {
          best = {
            movingSocketId: ownSocket.id,
            targetInstanceId: target.instanceId,
            targetSocketId: targetSocket.id,
            targetPoint,
            targetWorldPoint,
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
export function translatePartTree(parts: CustomItemPartPlacement[], rootId: string, dx: number, dy: number): CustomItemPartPlacement[] {
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
          position: [part.transform.position[0] + dx, part.transform.position[1] + dy, part.transform.position[2]] as [number, number, number],
        },
      }
    : part)
}

export function translatePartTree3D(parts: CustomItemPartPlacement[], rootId: string, delta: Vec3): CustomItemPartPlacement[] {
  const [dx, dy, dz] = delta
  if (!dx && !dy && !dz) return parts
  const affected = collectPartTreeIds(parts, rootId)
  return parts.map((part) => affected.has(part.instanceId)
    ? {
        ...part,
        transform: {
          ...part.transform,
          position: [part.transform.position[0] + dx, part.transform.position[1] + dy, part.transform.position[2] + dz],
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
      const targetPoint = socketWorldPoint3D(target, attachment.socketId)
      if (!targetPoint) return { ...part, attachedTo: undefined }
      const aligned = alignPartSocketToWorldPoint(part, attachment.ownSocketId, targetPoint)
      const [ox, oy, oz] = part.transform.position
      const [nx, ny, nz] = aligned.transform.position
      if (Math.abs(ox - nx) > 0.01 || Math.abs(oy - ny) > 0.01 || Math.abs(oz - nz) > 0.01) changed = true
      return aligned
    })
    if (!changed) break
  }
  return next
}

export function connectedCount(parts: CustomItemPartPlacement[]) {
  return parts.filter((part) => Boolean(part.attachedTo)).length
}
