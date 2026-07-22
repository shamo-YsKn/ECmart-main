$ErrorActionPreference = "Stop"

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )

    $fullPath = [System.IO.Path]::GetFullPath(
        (Join-Path (Get-Location) $Path)
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($fullPath, $Content, $encoding)
}

if (-not (Test-Path ".\package.json")) {
    throw "package.json が見つかりません。package.json と同じフォルダで実行してください。"
}

$componentDirectory = ".\components\robot"
$componentPath = Join-Path $componentDirectory "robot-character-3d.tsx"
$workshopPath = Join-Path $componentDirectory "robot-workshop.tsx"

if (-not (Test-Path $workshopPath)) {
    throw "components\robot\robot-workshop.tsx が見つかりません。"
}

New-Item -ItemType Directory -Force -Path $componentDirectory | Out-Null

$component = @'
"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import {
  ContactShadows,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei"
import type {
  RobotConfig,
  RobotItem,
  RobotPose,
} from "@/lib/types"

type Point3D = [number, number, number]

type ArmPosition = {
  elbow: Point3D
  hand: Point3D
}

type PoseDefinition = {
  left: ArmPosition
  right: ArmPosition
}

const METALNESS = 0.82
const ROUGHNESS = 0.28

function MetalMaterial({
  color,
  roughness = ROUGHNESS,
  metalness = METALNESS,
}: {
  color: string
  roughness?: number
  metalness?: number
}) {
  return (
    <meshStandardMaterial
      color={color}
      metalness={metalness}
      roughness={roughness}
    />
  )
}

function Bar({
  from,
  to,
  color,
  width = 0.13,
  depth = 0.18,
}: {
  from: Point3D
  to: Point3D
  color: string
  width?: number
  depth?: number
}) {
  const deltaX = to[0] - from[0]
  const deltaY = to[1] - from[1]
  const deltaZ = to[2] - from[2]

  const length = Math.sqrt(
    deltaX * deltaX +
      deltaY * deltaY +
      deltaZ * deltaZ,
  )

  const angle = Math.atan2(deltaY, deltaX)

  const midpoint: Point3D = [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2,
  ]

  return (
    <mesh
      position={midpoint}
      rotation={[0, 0, angle]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[length, width, depth]} />
      <MetalMaterial color={color} />
    </mesh>
  )
}

function Joint({
  position,
  color,
  radius = 0.12,
}: {
  position: Point3D
  color: string
  radius?: number
}) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[radius, 20, 20]} />
      <MetalMaterial color={color} roughness={0.22} />
    </mesh>
  )
}

function ScrewEye({
  x,
  color,
  accentColor,
}: {
  x: number
  color: string
  accentColor: string
}) {
  return (
    <group position={[x, 1.61, 0.4]}>
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.225, 0.225, 0.17, 32]} />
        <MetalMaterial color={color} roughness={0.2} />
      </mesh>

      <mesh position={[0, 0, 0.095]} castShadow>
        <boxGeometry args={[0.28, 0.052, 0.04]} />
        <meshStandardMaterial
          color={accentColor}
          metalness={0.35}
          roughness={0.42}
        />
      </mesh>

      <mesh
        position={[0, 0, 0.097]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <boxGeometry args={[0.28, 0.052, 0.04]} />
        <meshStandardMaterial
          color={accentColor}
          metalness={0.35}
          roughness={0.42}
        />
      </mesh>
    </group>
  )
}

function RobotHead({
  bodyColor,
  accentColor,
}: {
  bodyColor: string
  accentColor: string
}) {
  return (
    <group>
      <RoundedBox
        position={[-0.405, 1.37, 0]}
        args={[0.79, 0.68, 0.66]}
        radius={0.08}
        smoothness={4}
        castShadow
      >
        <MetalMaterial color={bodyColor} />
      </RoundedBox>

      <RoundedBox
        position={[0.405, 1.37, 0]}
        args={[0.79, 0.68, 0.66]}
        radius={0.08}
        smoothness={4}
        castShadow
      >
        <MetalMaterial color={bodyColor} />
      </RoundedBox>

      <ScrewEye
        x={-0.4}
        color={bodyColor}
        accentColor={accentColor}
      />

      <ScrewEye
        x={0.4}
        color={bodyColor}
        accentColor={accentColor}
      />
    </group>
  )
}

function ThreadedBody({
  bodyColor,
}: {
  bodyColor: string
}) {
  return (
    <group>
      <RoundedBox
        position={[0, 0.2, 0]}
        args={[0.92, 1.75, 0.68]}
        radius={0.08}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <MetalMaterial color={bodyColor} />
      </RoundedBox>

      {Array.from({ length: 10 }, (_, index) => {
        const y = -0.52 + index * 0.16

        return (
          <RoundedBox
            key={index}
            position={[0, y, 0]}
            args={[1.015, 0.063, 0.735]}
            radius={0.02}
            smoothness={2}
            castShadow
          >
            <MetalMaterial
              color={bodyColor}
              roughness={0.34}
            />
          </RoundedBox>
        )
      })}
    </group>
  )
}

function getPose(
  base: RobotConfig["base"],
  pose: RobotPose,
): PoseDefinition {
  const leftShoulder: Point3D = [-0.56, 0.62, -0.02]
  const rightShoulder: Point3D = [0.56, 0.62, -0.02]

  if (pose === "wave") {
    return {
      left: {
        elbow: [-0.92, 0.18, 0],
        hand: [-1.02, -0.28, 0.02],
      },
      right: {
        elbow: [1.02, 1.03, 0],
        hand: [0.76, 1.55, 0.04],
      },
    }
  }

  if (pose === "cheer") {
    return {
      left: {
        elbow: [-0.92, 1.03, 0],
        hand: [-1.17, 1.55, 0.04],
      },
      right: {
        elbow: [0.92, 1.03, 0],
        hand: [1.17, 1.55, 0.04],
      },
    }
  }

  if (pose === "point") {
    return {
      left: {
        elbow: [-0.9, 0.2, 0],
        hand: [-1.0, -0.24, 0.02],
      },
      right: {
        elbow: [0.98, 0.62, 0],
        hand: [1.52, 0.67, 0.04],
      },
    }
  }

  if (base === "natty") {
    return {
      left: {
        elbow: [-0.88, 0.25, 0],
        hand: [-0.92, -0.18, 0.03],
      },
      right: {
        elbow: [0.84, 0.35, 0],
        hand: [0.98, -0.03, 0.04],
      },
    }
  }

  return {
    left: {
      elbow: [-0.92, 0.2, 0],
      hand: [-1.05, -0.27, 0.03],
    },
    right: {
      elbow: [0.92, 0.2, 0],
      hand: [1.05, -0.27, 0.03],
    },
  }
}

function RobotHand({
  position,
  side,
  bodyColor,
}: {
  position: Point3D
  side: "left" | "right"
  bodyColor: string
}) {
  return (
    <mesh
      position={position}
      rotation={[
        0,
        0,
        side === "left" ? -0.45 : 0.45,
      ]}
      castShadow
    >
      <coneGeometry args={[0.2, 0.3, 3]} />
      <MetalMaterial color={bodyColor} />
    </mesh>
  )
}

function Arms({
  config,
}: {
  config: RobotConfig
}) {
  const pose = getPose(config.base, config.pose)

  const leftShoulder: Point3D = [-0.56, 0.62, -0.02]
  const rightShoulder: Point3D = [0.56, 0.62, -0.02]

  return (
    <group>
      <Bar
        from={leftShoulder}
        to={pose.left.elbow}
        color={config.bodyColor}
      />
      <Bar
        from={pose.left.elbow}
        to={pose.left.hand}
        color={config.bodyColor}
      />

      <Bar
        from={rightShoulder}
        to={pose.right.elbow}
        color={config.bodyColor}
      />
      <Bar
        from={pose.right.elbow}
        to={pose.right.hand}
        color={config.bodyColor}
      />

      <Joint
        position={leftShoulder}
        color={config.bodyColor}
      />
      <Joint
        position={rightShoulder}
        color={config.bodyColor}
      />
      <Joint
        position={pose.left.elbow}
        color={config.bodyColor}
        radius={0.105}
      />
      <Joint
        position={pose.right.elbow}
        color={config.bodyColor}
        radius={0.105}
      />

      <RobotHand
        position={pose.left.hand}
        side="left"
        bodyColor={config.bodyColor}
      />
      <RobotHand
        position={pose.right.hand}
        side="right"
        bodyColor={config.bodyColor}
      />

      <Item3D
        item={config.item}
        position={[
          pose.right.hand[0],
          pose.right.hand[1] + 0.18,
          pose.right.hand[2] + 0.15,
        ]}
        color={config.accentColor}
      />
    </group>
  )
}

function VoltaWaist({
  bodyColor,
}: {
  bodyColor: string
}) {
  return (
    <mesh position={[0, -0.83, 0]} castShadow>
      <cylinderGeometry args={[0.34, 0.45, 0.34, 6]} />
      <MetalMaterial color={bodyColor} />
    </mesh>
  )
}

function NattyWaist({
  bodyColor,
  accentColor,
}: {
  bodyColor: string
  accentColor: string
}) {
  return (
    <group position={[0, -0.93, 0]}>
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.76, 0.76, 0.39, 6]} />
        <MetalMaterial color={bodyColor} />
      </mesh>

      <mesh
        position={[0, 0, 0.22]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.31, 0.31, 0.045, 6]} />
        <meshStandardMaterial
          color={accentColor}
          metalness={0.2}
          roughness={0.55}
        />
      </mesh>
    </group>
  )
}

function Legs({
  config,
}: {
  config: RobotConfig
}) {
  if (config.base === "natty") {
    const leftHip: Point3D = [-0.24, -1.08, 0]
    const leftKnee: Point3D = [-0.35, -1.53, 0.02]
    const leftFoot: Point3D = [-0.54, -1.96, 0.08]

    const rightHip: Point3D = [0.24, -1.08, 0]
    const rightKnee: Point3D = [0.13, -1.54, 0.02]
    const rightFoot: Point3D = [0.36, -1.96, 0.09]

    return (
      <group>
        <Bar from={leftHip} to={leftKnee} color={config.bodyColor} />
        <Bar from={leftKnee} to={leftFoot} color={config.bodyColor} />
        <Bar from={rightHip} to={rightKnee} color={config.bodyColor} />
        <Bar from={rightKnee} to={rightFoot} color={config.bodyColor} />

        <Joint position={leftKnee} color={config.bodyColor} radius={0.1} />
        <Joint position={rightKnee} color={config.bodyColor} radius={0.1} />

        <mesh
          position={[-0.57, -2.01, 0.16]}
          rotation={[0, -0.16, -0.14]}
          castShadow
        >
          <boxGeometry args={[0.44, 0.15, 0.48]} />
          <MetalMaterial color={config.bodyColor} />
        </mesh>

        <mesh
          position={[0.4, -2.01, 0.16]}
          rotation={[0, 0.16, 0.12]}
          castShadow
        >
          <boxGeometry args={[0.44, 0.15, 0.48]} />
          <MetalMaterial color={config.bodyColor} />
        </mesh>
      </group>
    )
  }

  const leftHip: Point3D = [-0.25, -0.93, 0]
  const leftKnee: Point3D = [-0.48, -1.47, 0.02]
  const leftFoot: Point3D = [-0.7, -1.96, 0.08]

  const rightHip: Point3D = [0.25, -0.93, 0]
  const rightKnee: Point3D = [0.48, -1.47, 0.02]
  const rightFoot: Point3D = [0.7, -1.96, 0.08]

  return (
    <group>
      <Bar from={leftHip} to={leftKnee} color={config.bodyColor} />
      <Bar from={leftKnee} to={leftFoot} color={config.bodyColor} />
      <Bar from={rightHip} to={rightKnee} color={config.bodyColor} />
      <Bar from={rightKnee} to={rightFoot} color={config.bodyColor} />

      <Joint position={leftKnee} color={config.bodyColor} radius={0.1} />
      <Joint position={rightKnee} color={config.bodyColor} radius={0.1} />

      <mesh
        position={[-0.73, -2.01, 0.16]}
        rotation={[0, -0.08, -0.08]}
        castShadow
      >
        <boxGeometry args={[0.46, 0.15, 0.5]} />
        <MetalMaterial color={config.bodyColor} />
      </mesh>

      <mesh
        position={[0.73, -2.01, 0.16]}
        rotation={[0, 0.08, 0.08]}
        castShadow
      >
        <boxGeometry args={[0.46, 0.15, 0.5]} />
        <MetalMaterial color={config.bodyColor} />
      </mesh>
    </group>
  )
}

function Item3D({
  item,
  position,
  color,
}: {
  item: RobotItem
  position: Point3D
  color: string
}) {
  if (item === "none") {
    return null
  }

  if (item === "wrench") {
    return (
      <group position={position} rotation={[0, 0, -0.35]}>
        <mesh castShadow>
          <boxGeometry args={[0.1, 0.62, 0.09]} />
          <MetalMaterial color={color} />
        </mesh>

        <mesh position={[0, 0.34, 0]} castShadow>
          <torusGeometry
            args={[0.15, 0.05, 8, 24, Math.PI * 1.5]}
          />
          <MetalMaterial color={color} />
        </mesh>
      </group>
    )
  }

  if (item === "gear") {
    return (
      <group position={position}>
        <mesh castShadow>
          <torusGeometry args={[0.2, 0.08, 10, 28]} />
          <MetalMaterial color={color} />
        </mesh>

        {Array.from({ length: 8 }, (_, index) => (
          <mesh
            key={index}
            rotation={[0, 0, (index * Math.PI) / 4]}
            castShadow
          >
            <boxGeometry args={[0.55, 0.07, 0.1]} />
            <MetalMaterial color={color} />
          </mesh>
        ))}
      </group>
    )
  }

  if (item === "flower") {
    return (
      <group position={position}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.5, 10]} />
          <meshStandardMaterial color="#5d965b" roughness={0.6} />
        </mesh>

        {Array.from({ length: 6 }, (_, index) => {
          const angle = (index * Math.PI) / 3

          return (
            <mesh
              key={index}
              position={[
                Math.cos(angle) * 0.13,
                Math.sin(angle) * 0.13 + 0.08,
                0,
              ]}
              scale={[1, 1.5, 0.65]}
              castShadow
            >
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshStandardMaterial color={color} roughness={0.55} />
            </mesh>
          )
        })}

        <mesh position={[0, 0.08, 0.04]} castShadow>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshStandardMaterial color="#e7ad35" roughness={0.5} />
        </mesh>
      </group>
    )
  }

  return (
    <group position={position} rotation={[0, 0, Math.PI]}>
      <mesh position={[-0.09, 0.04, 0]} castShadow>
        <sphereGeometry args={[0.13, 20, 20]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>

      <mesh position={[0.09, 0.04, 0]} castShadow>
        <sphereGeometry args={[0.13, 20, 20]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>

      <mesh position={[0, -0.11, 0]} castShadow>
        <coneGeometry args={[0.18, 0.34, 4]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
    </group>
  )
}

function RobotModel({
  config,
}: {
  config: RobotConfig
}) {
  const viewRotation =
    config.view === "front"
      ? 0
      : config.view === "side"
        ? Math.PI / 2
        : Math.PI

  const normalizedSize = Math.min(
    1,
    Math.max(0, (config.size - 20) / 70),
  )

  const modelScale = 0.74 + normalizedSize * 0.25

  return (
    <group
      rotation={[0, viewRotation, 0]}
      scale={modelScale}
      position={[0, 0.06, 0]}
    >
      <Arms config={config} />
      <Legs config={config} />
      <ThreadedBody bodyColor={config.bodyColor} />

      {config.base === "volta" ? (
        <VoltaWaist bodyColor={config.bodyColor} />
      ) : (
        <NattyWaist
          bodyColor={config.bodyColor}
          accentColor={config.accentColor}
        />
      )}

      <RobotHead
        bodyColor={config.bodyColor}
        accentColor={config.accentColor}
      />
    </group>
  )
}

function Scene({
  config,
}: {
  config: RobotConfig
}) {
  return (
    <>
      <ambientLight intensity={1.1} />

      <hemisphereLight
        intensity={1.15}
        color="#ffffff"
        groundColor="#8b7568"
      />

      <directionalLight
        position={[4, 6, 5]}
        intensity={2.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <directionalLight
        position={[-4, 2, 2]}
        intensity={0.85}
        color="#b9d8ff"
      />

      <Suspense fallback={null}>
        <RobotModel config={config} />
      </Suspense>

      <ContactShadows
        position={[0, -2.08, 0]}
        opacity={0.28}
        scale={5.5}
        blur={2.5}
        far={4}
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={9}
        minPolarAngle={0.72}
        maxPolarAngle={2.05}
        target={[0, -0.05, 0]}
      />
    </>
  )
}

export function RobotCharacter3D({
  config,
  className,
}: {
  config: RobotConfig
  className?: string
}) {
  const robotName =
    config.name ||
    (config.base === "volta" ? "ボルタ" : "ナッティ")

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-2xl ${
        className ?? ""
      }`}
      aria-label={`${robotName}の3Dプレビュー`}
      role="img"
    >
      <Canvas
        shadows
        dpr={[1, 1.7]}
        camera={{
          position: [0.15, 0.05, 7],
          fov: 35,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        fallback={
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            このブラウザでは3D表示を利用できません。
          </div>
        }
      >
        <Scene config={config} />
      </Canvas>

      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border bg-background/80 px-3 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
        ドラッグで回転・ホイールで拡大縮小
      </div>
    </div>
  )
}
'@

Write-Utf8NoBom -Path $componentPath -Content $component

$workshop = [System.IO.File]::ReadAllText(
    [System.IO.Path]::GetFullPath($workshopPath)
)

$oldImport = 'import { RobotCharacter } from "./robot-character"'
$newImport = 'import dynamic from "next/dynamic"'

if ($workshop.Contains($oldImport)) {
    $workshop = $workshop.Replace($oldImport, $newImport)
}
elseif (-not $workshop.Contains($newImport)) {
    throw "robot-workshop.tsx のRobotCharacter importを特定できませんでした。"
}

if (-not $workshop.Contains("const RobotCharacter3D = dynamic(")) {
    $loader = @'
const RobotCharacter3D = dynamic(
  () =>
    import("./robot-character-3d").then(
      (module) => module.RobotCharacter3D,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        3Dモデルを読み込んでいます…
      </div>
    ),
  },
)

'@

    $marker = "const BODY_COLORS"

    if (-not $workshop.Contains($marker)) {
        throw "robot-workshop.tsx の挿入位置を特定できませんでした。"
    }

    $workshop = $workshop.Replace(
        $marker,
        $loader + $marker
    )
}

$workshop = $workshop.Replace(
    "<RobotCharacter",
    "<RobotCharacter3D"
)

Write-Utf8NoBom -Path $workshopPath -Content $workshop

$npmrc = @'
registry=https://registry.npmjs.org/
replace-registry-host=always
'@

Write-Utf8NoBom -Path ".\.npmrc" -Content $npmrc

if (Test-Path ".\package-lock.json") {
    $lockContent = Get-Content ".\package-lock.json" -Raw

    if ($lockContent -match "applied-caas-gateway") {
        Write-Host "古い内部レジストリを含む package-lock.json を削除します。"
        Remove-Item ".\package-lock.json" -Force
    }
}

Write-Host ""
Write-Host "3D表示用パッケージをインストールします。"
Write-Host ""

npm install `
    "three@^0.185.1" `
    "@react-three/fiber@^9.6.1" `
    "@react-three/drei@^10.7.7"

if ($LASTEXITCODE -ne 0) {
    throw "npm install に失敗しました。表示されたnpmエラーを確認してください。"
}

Write-Host ""
Write-Host "=========================================="
Write-Host "ボルタ・ナッティの3D化が完了しました。"
Write-Host "次のコマンドで起動してください。"
Write-Host ""
Write-Host "npm run dev"
Write-Host "=========================================="