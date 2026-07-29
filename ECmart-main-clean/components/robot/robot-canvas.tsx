"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { RobotConfig, RobotItem } from "@/lib/types"
import { ROBOT_BASE_PARTS, ROBOT_POSE_PARTS, ROBOT_VIEW_PARTS } from "@/lib/robot-parts"

type Vec3 = [number, number, number]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function pointFromAngle(origin: Vec3, angleDegrees: number, length: number): Vec3 {
  const angle = THREE.MathUtils.degToRad(angleDegrees)
  return [origin[0] + Math.cos(angle) * length, origin[1] + Math.sin(angle) * length, origin[2]]
}

function MetalMaterial({ color }: { color: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      metalness={0.72}
      roughness={0.22}
      clearcoat={0.66}
      clearcoatRoughness={0.17}
      envMapIntensity={1.18}
    />
  )
}

function AccentMaterial({ color }: { color: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      metalness={0.44}
      roughness={0.24}
      clearcoat={0.5}
      clearcoatRoughness={0.2}
    />
  )
}

function DarkMaterial() {
  return <meshStandardMaterial color="#173744" metalness={0.5} roughness={0.32} />
}

function LimbSegment({ start, end, radius, color }: { start: Vec3; end: Vec3; radius: number; color: string }) {
  const transform = useMemo(() => {
    const startVector = new THREE.Vector3(...start)
    const endVector = new THREE.Vector3(...end)
    const direction = endVector.clone().sub(startVector)
    const midpoint = startVector.clone().add(endVector).multiplyScalar(0.5)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    )
    return { length: direction.length(), midpoint, quaternion }
  }, [end, start])

  return (
    <group>
      <mesh castShadow position={transform.midpoint} quaternion={transform.quaternion}>
        <cylinderGeometry args={[radius * 1.2, radius * 1.2, transform.length, 14]} />
        <DarkMaterial />
      </mesh>
      <mesh castShadow position={transform.midpoint} quaternion={transform.quaternion}>
        <cylinderGeometry args={[radius, radius, transform.length * 1.012, 18]} />
        <MetalMaterial color={color} />
      </mesh>
    </group>
  )
}

function useHexHeadGeometry() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.48, -0.2)
    shape.lineTo(-0.37, -0.31)
    shape.lineTo(0.37, -0.31)
    shape.lineTo(0.48, -0.2)
    shape.lineTo(0.48, 0.2)
    shape.lineTo(0.37, 0.31)
    shape.lineTo(-0.37, 0.31)
    shape.lineTo(-0.48, 0.2)
    shape.closePath()
    const result = new THREE.ExtrudeGeometry(shape, {
      depth: 0.58,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      curveSegments: 3,
    })
    result.translate(0, 0, -0.29)
    result.computeVertexNormals()
    return result
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

function ScrewEye({ x, bodyColor, accentColor }: { x: number; bodyColor: string; accentColor: string }) {
  return (
    <group position={[x, 2.36, 0.34]}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.265, 0.265, 0.145, 36]} />
        <MetalMaterial color={bodyColor} />
      </mesh>
      <mesh position={[0, 0, 0.082]} castShadow>
        <boxGeometry args={[0.31, 0.06, 0.038]} />
        <AccentMaterial color={accentColor} />
      </mesh>
      <mesh position={[0, 0, 0.084]} castShadow>
        <boxGeometry args={[0.06, 0.31, 0.038]} />
        <AccentMaterial color={accentColor} />
      </mesh>
    </group>
  )
}

function RobotHead({ bodyColor, accentColor }: Pick<RobotConfig, "bodyColor" | "accentColor">) {
  const geometry = useHexHeadGeometry()
  return (
    <group>
      <mesh geometry={geometry} position={[0, 1.98, 0]} castShadow receiveShadow>
        <MetalMaterial color={bodyColor} />
      </mesh>
      <ScrewEye x={-0.29} bodyColor={bodyColor} accentColor={accentColor} />
      <ScrewEye x={0.29} bodyColor={bodyColor} accentColor={accentColor} />
      <mesh position={[0, 1.98, -0.325]} castShadow>
        <boxGeometry args={[0.38, 0.11, 0.045]} />
        <DarkMaterial />
      </mesh>
    </group>
  )
}

function ThreadedBody({ bodyColor }: Pick<RobotConfig, "bodyColor">) {
  return (
    <group>
      <mesh castShadow position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.31, 0.31, 1.45, 28]} />
        <MetalMaterial color={bodyColor} />
      </mesh>
      {Array.from({ length: 14 }, (_, index) => (
        <mesh key={index} castShadow position={[0, 0.29 + index * 0.103, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.34, 0.045, 10, 36]} />
          <meshStandardMaterial color={bodyColor} metalness={0.82} roughness={0.28} />
        </mesh>
      ))}
      <mesh position={[-0.17, 0.96, 0.295]}>
        <boxGeometry args={[0.035, 1.25, 0.018]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.22} />
      </mesh>
    </group>
  )
}

function Waist({ base, bodyColor }: Pick<RobotConfig, "base" | "bodyColor">) {
  if (base === "natty") {
    return (
      <group position={[0, 0.12, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.34, 0.84, 0.42, 36]} />
          <MetalMaterial color={bodyColor} />
        </mesh>
        <mesh position={[0, 0.225, 0]}>
          <cylinderGeometry args={[0.27, 0.27, 0.026, 28]} />
          <DarkMaterial />
        </mesh>
      </group>
    )
  }
  return null
}

function CounterSunkFoot({ position, bodyColor, rotationZ }: { position: Vec3; bodyColor: string; rotationZ: number }) {
  return (
    <mesh castShadow position={position} rotation={[0, 0, rotationZ]}>
      <cylinderGeometry args={[0.13, 0.34, 0.2, 36]} />
      <MetalMaterial color={bodyColor} />
    </mesh>
  )
}

function RobotLeg({ side, base, bodyColor }: { side: -1 | 1; base: RobotConfig["base"]; bodyColor: string }) {
  const leg = ROBOT_BASE_PARTS[base].threeD
  const hipY = base === "natty" ? -0.1 : 0.2
  const hip: Vec3 = [side * leg.hipX, hipY, 0]
  const knee: Vec3 = [side * leg.kneeX, -0.68, 0]
  const ankle: Vec3 = [side * leg.ankleX, -1.32, 0]

  return (
    <group>
      <LimbSegment start={hip} end={knee} radius={0.072} color={bodyColor} />
      <LimbSegment start={knee} end={ankle} radius={0.068} color={bodyColor} />
      <CounterSunkFoot
        position={[ankle[0] + side * 0.035, ankle[1] - 0.12, 0.04]}
        rotationZ={side * -0.035}
        bodyColor={bodyColor}
      />
    </group>
  )
}

function Wrench({ color }: { color: string }) {
  return (
    <group rotation={[0, 0, -0.28]}>
      <mesh position={[0, 0.34, 0]} castShadow>
        <boxGeometry args={[0.12, 0.7, 0.12]} />
        <AccentMaterial color={color} />
      </mesh>
      <mesh position={[-0.12, 0.73, 0]} rotation={[0, 0, -0.55]} castShadow>
        <boxGeometry args={[0.13, 0.34, 0.14]} />
        <AccentMaterial color={color} />
      </mesh>
      <mesh position={[0.12, 0.73, 0]} rotation={[0, 0, 0.55]} castShadow>
        <boxGeometry args={[0.13, 0.34, 0.14]} />
        <AccentMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.04, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.1, 0.035, 10, 24]} />
        <DarkMaterial />
      </mesh>
    </group>
  )
}

function Gear({ color }: { color: string }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <torusGeometry args={[0.27, 0.09, 12, 28]} />
        <AccentMaterial color={color} />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2
        return (
          <mesh
            key={index}
            castShadow
            position={[Math.cos(angle) * 0.38, 0, Math.sin(angle) * 0.38]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[0.16, 0.16, 0.18]} />
            <AccentMaterial color={color} />
          </mesh>
        )
      })}
    </group>
  )
}

function Flower({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 0.72, 10]} />
        <meshStandardMaterial color="#4d8757" roughness={0.55} />
      </mesh>
      {Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * Math.PI * 2
        return (
          <mesh
            key={index}
            castShadow
            position={[Math.cos(angle) * 0.18, 0.69 + Math.sin(angle) * 0.18, 0]}
            scale={[0.7, 1.15, 0.55]}
          >
            <sphereGeometry args={[0.16, 18, 12]} />
            <AccentMaterial color={color} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.69, 0.08]} castShadow>
        <sphereGeometry args={[0.13, 20, 14]} />
        <meshStandardMaterial color="#e4ad32" metalness={0.18} roughness={0.4} />
      </mesh>
    </group>
  )
}

function Heart({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0.12)
    shape.bezierCurveTo(-0.38, 0.48, -0.66, 0.04, 0, -0.55)
    shape.bezierCurveTo(0.66, 0.04, 0.38, 0.48, 0, 0.12)
    const result = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.045,
      bevelThickness: 0.045,
      curveSegments: 20,
    })
    result.center()
    return result
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} scale={0.75} rotation={[0, 0, Math.PI]} castShadow>
      <AccentMaterial color={color} />
    </mesh>
  )
}

function HeldItem3D({ item, color }: { item: RobotItem; color: string }) {
  if (item === "none") return null
  if (item === "wrench") return <Wrench color={color} />
  if (item === "gear") return <Gear color={color} />
  if (item === "flower") return <Flower color={color} />
  return <Heart color={color} />
}

function RobotArm({
  side,
  angles,
  bodyColor,
  accentColor,
  item,
}: {
  side: "left" | "right"
  angles: [number, number]
  bodyColor: string
  accentColor: string
  item: RobotItem
}) {
  const sign = side === "left" ? -1 : 1
  const shoulder: Vec3 = [sign * 0.46, 1.69, 0]
  const elbow = pointFromAngle(shoulder, angles[0], 0.73)
  const hand = pointFromAngle(elbow, angles[1], 0.67)
  const forearmAngle = THREE.MathUtils.degToRad(angles[1])

  return (
    <group>
      <mesh castShadow position={shoulder}>
        <sphereGeometry args={[0.13, 22, 16]} />
        <MetalMaterial color={bodyColor} />
      </mesh>
      <LimbSegment start={shoulder} end={elbow} radius={0.075} color={bodyColor} />
      <mesh castShadow position={elbow}>
        <sphereGeometry args={[0.135, 18, 12]} />
        <DarkMaterial />
      </mesh>
      <LimbSegment start={elbow} end={hand} radius={0.07} color={bodyColor} />
      <mesh castShadow position={hand} rotation={[0, 0, forearmAngle - Math.PI / 2]}>
        <cylinderGeometry args={[0.11, 0.28, 0.17, 32]} />
        <MetalMaterial color={bodyColor} />
      </mesh>
      {side === "right" && item !== "none" && (
        <group position={[hand[0], hand[1] + 0.24, 0.3]} scale={0.75}>
          <HeldItem3D item={item} color={accentColor} />
        </group>
      )}
    </group>
  )
}

function RobotModel({ config }: { config: RobotConfig }) {
  const angles = ROBOT_POSE_PARTS[config.pose].threeD[config.base]

  return (
    <group position={[0, -0.42, 0]}>
      <RobotArm
        side="left"
        angles={angles.left}
        bodyColor={config.bodyColor}
        accentColor={config.accentColor}
        item="none"
      />
      <RobotArm
        side="right"
        angles={angles.right}
        bodyColor={config.bodyColor}
        accentColor={config.accentColor}
        item={config.item}
      />
      <RobotLeg side={-1} base={config.base} bodyColor={config.bodyColor} />
      <RobotLeg side={1} base={config.base} bodyColor={config.bodyColor} />
      <ThreadedBody bodyColor={config.bodyColor} />
      <Waist base={config.base} bodyColor={config.bodyColor} />
      <RobotHead bodyColor={config.bodyColor} accentColor={config.accentColor} />
    </group>
  )
}

function SceneEnvironment() {
  const { gl, scene, invalidate } = useThree()

  useEffect(() => {
    const previous = scene.environment
    const pmrem = new THREE.PMREMGenerator(gl)
    const room = new THREE.Scene()
    room.background = new THREE.Color("#dce9ed")

    const panelMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff" })
    const warmMaterial = new THREE.MeshBasicMaterial({ color: "#ffd9ad" })
    const coolMaterial = new THREE.MeshBasicMaterial({ color: "#9dd9e8" })
    const geometry = new THREE.PlaneGeometry(4, 4)
    const panels = [
      new THREE.Mesh(geometry, panelMaterial),
      new THREE.Mesh(geometry, warmMaterial),
      new THREE.Mesh(geometry, coolMaterial),
    ]
    panels[0].position.set(0, 3, 1)
    panels[0].rotation.x = Math.PI / 2
    panels[1].position.set(-3, 0, 1)
    panels[1].rotation.y = Math.PI / 2
    panels[2].position.set(3, 0, 0)
    panels[2].rotation.y = -Math.PI / 2
    room.add(...panels)

    const texture = pmrem.fromScene(room, 0.05).texture
    scene.environment = texture
    invalidate()

    return () => {
      scene.environment = previous
      texture.dispose()
      geometry.dispose()
      panelMaterial.dispose()
      warmMaterial.dispose()
      coolMaterial.dispose()
      pmrem.dispose()
      invalidate()
    }
  }, [gl, invalidate, scene])

  return null
}

function StaticRig({
  config,
  scale,
}: {
  config: RobotConfig
  scale: number
}) {
  return (
    <group rotation={[0, ROBOT_VIEW_PARTS[config.view].yaw, 0]} scale={scale}>
      <RobotModel config={config} />
    </group>
  )
}

function InteractiveRig({
  config,
  scale,
}: {
  config: RobotConfig
  scale: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const { gl } = useThree()
  const target = useRef({ yaw: ROBOT_VIEW_PARTS[config.view].yaw, pitch: 0, zoom: 1 })
  const current = useRef({ yaw: ROBOT_VIEW_PARTS[config.view].yaw, pitch: 0, zoom: 1 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)

  useEffect(() => {
    target.current.yaw = ROBOT_VIEW_PARTS[config.view].yaw
    target.current.pitch = 0
  }, [config.view])

  useEffect(() => {
    const canvas = gl.domElement

    const pointerDistance = () => {
      const values = Array.from(pointers.current.values())
      if (values.length < 2) return 0
      return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y)
    }

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault()
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      canvas.setPointerCapture?.(event.pointerId)
      if (pointers.current.size === 2) {
        pinch.current = { distance: pointerDistance(), zoom: target.current.zoom }
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      const previous = pointers.current.get(event.pointerId)
      if (!previous) return
      event.preventDefault()

      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

      if (pointers.current.size === 1) {
        target.current.yaw += (event.clientX - previous.x) * 0.012
        target.current.pitch = clamp(
          target.current.pitch + (event.clientY - previous.y) * 0.008,
          -0.42,
          0.42,
        )
      } else if (pointers.current.size >= 2 && pinch.current) {
        const distance = pointerDistance()
        if (pinch.current.distance > 0) {
          target.current.zoom = clamp(
            pinch.current.zoom * (distance / pinch.current.distance),
            0.72,
            1.65,
          )
        }
      }
    }

    const endPointer = (event: PointerEvent) => {
      pointers.current.delete(event.pointerId)
      if (canvas.hasPointerCapture?.(event.pointerId)) {
        canvas.releasePointerCapture?.(event.pointerId)
      }
      if (pointers.current.size < 2) pinch.current = null
      if (pointers.current.size === 1) {
        const remaining = Array.from(pointers.current.entries())[0]
        pointers.current.set(remaining[0], { ...remaining[1] })
      }
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      target.current.zoom = clamp(
        target.current.zoom * Math.exp(-event.deltaY * 0.0014),
        0.72,
        1.65,
      )
    }

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false })
    canvas.addEventListener("pointermove", onPointerMove, { passive: false })
    canvas.addEventListener("pointerup", endPointer)
    canvas.addEventListener("pointercancel", endPointer)
    canvas.addEventListener("wheel", onWheel, { passive: false })

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown)
      canvas.removeEventListener("pointermove", onPointerMove)
      canvas.removeEventListener("pointerup", endPointer)
      canvas.removeEventListener("pointercancel", endPointer)
      canvas.removeEventListener("wheel", onWheel)
    }
  }, [gl])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const factor = 1 - Math.exp(-delta * 12)
    const yawDifference = Math.atan2(
      Math.sin(target.current.yaw - current.current.yaw),
      Math.cos(target.current.yaw - current.current.yaw),
    )
    current.current.yaw += yawDifference * factor
    current.current.pitch = THREE.MathUtils.lerp(current.current.pitch, target.current.pitch, factor)
    current.current.zoom = THREE.MathUtils.lerp(current.current.zoom, target.current.zoom, factor)

    group.rotation.y = current.current.yaw
    group.rotation.x = current.current.pitch
    group.scale.setScalar(scale * current.current.zoom)
  })

  return (
    <group ref={groupRef}>
      <RobotModel config={config} />
    </group>
  )
}

function Scene({
  config,
  interactive,
  lightweight,
}: {
  config: RobotConfig
  interactive: boolean
  lightweight: boolean
}) {
  const sizeScale = 0.78 + ((clamp(config.size, 20, 90) - 20) / 70) * 0.4

  return (
    <>
      {interactive && !lightweight && <SceneEnvironment />}
      <ambientLight intensity={0.55} />
      <hemisphereLight color="#ffffff" groundColor="#78919a" intensity={1.15} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} castShadow={interactive && !lightweight} />
      <pointLight position={[-4, 2, 4]} color="#ffd6a8" intensity={lightweight ? 8 : 18} distance={12} />
      {!lightweight && <pointLight position={[4, 1, -3]} color="#8ed8ed" intensity={14} distance={12} />}

      {interactive ? (
        <InteractiveRig config={config} scale={sizeScale} />
      ) : (
        <StaticRig config={config} scale={sizeScale} />
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.82, 0]} receiveShadow>
        <circleGeometry args={[1.45, 48]} />
        <shadowMaterial transparent opacity={0.18} />
      </mesh>
    </>
  )
}

export function RobotCanvas({
  config,
  interactive = false,
}: {
  config: RobotConfig
  interactive?: boolean
}) {
  const lightweight =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 768)

  return (
    <Canvas
      camera={{ position: [0, 0.42, 7.6], fov: 31, near: 0.1, far: 100 }}
      dpr={lightweight ? 1 : [1, 1.5]}
      performance={{ min: lightweight ? 0.4 : 0.55 }}
      frameloop={interactive ? "always" : "demand"}
      shadows={interactive && !lightweight}
      gl={{
        alpha: true,
        antialias: !lightweight,
        powerPreference: lightweight ? "default" : "high-performance",
      }}
      onCreated={({ gl }: { gl: THREE.WebGLRenderer }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.08
      }}
      style={{
        touchAction: interactive ? "none" : "auto",
        pointerEvents: interactive ? "auto" : "none",
      }}
    >
      <Scene config={config} interactive={interactive} lightweight={lightweight} />
    </Canvas>
  )
}
