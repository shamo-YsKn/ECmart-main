import { MuralBackground } from "@/components/mural/mural-background"
import { RobotFallback } from "@/components/robot/robot-fallback"
import { snapMuralRobotY, type MuroranSpot } from "@/lib/mural-spots"
import type { AmbientMuralRobot } from "@/lib/mural-npc"
import type { MuralPost } from "@/lib/mural-model"

export function MobileMuralStage({
  spot,
  ambientRobots,
  posts,
}: {
  spot: MuroranSpot
  ambientRobots: AmbientMuralRobot[]
  posts: MuralPost[]
}) {
  return (
    <div className="relative aspect-[4/3] min-h-[280px] overflow-hidden rounded-3xl border-4 border-[#6c5c50] bg-muted shadow-inner">
      <MuralBackground spot={spot} />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] bg-gradient-to-b from-black/45 to-transparent p-3 text-white">
        <div className="font-display text-base font-black drop-shadow">{spot.name}</div>
        <div className="text-[10px] font-bold opacity-90">みんなでつくる場所限定壁画</div>
      </div>

      {ambientRobots.map((robot) => (
        <div
          key={robot.id}
          className="absolute z-10 h-[31%] w-[23%] min-w-16 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${robot.positionX}%`,
            top: `${robot.positionY}%`,
            transform: `translate(-50%, -50%) rotate(${robot.rotationDeg}deg) scale(${robot.scale})`,
            transformOrigin: "50% 82%",
          }}
          title={`${robot.label}（街のロボット）`}
        >
          <RobotFallback config={robot.config} />
        </div>
      ))}

      {posts.map((post) => (
        <a
          key={post.id}
          href={`#mobile-review-${post.id}`}
          className="absolute z-20 h-[31%] w-[23%] min-w-16 -translate-x-1/2 -translate-y-1/2 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-primary/50"
          style={{
            left: `${post.positionX}%`,
            top: `${snapMuralRobotY(spot, post.positionX, post.positionY)}%`,
            transform: `translate(-50%, -50%) rotate(${post.rotationDeg}deg) scale(${post.scale})`,
            transformOrigin: "50% 82%",
          }}
          aria-label={`${post.authorName}さんのレビューへ移動`}
        >
          <RobotFallback config={{ ...post.robotConfig, view: post.robotView }} customItemDocument={post.customItemDocument} />
          <span className="absolute right-0 top-0 flex size-5 items-center justify-center rounded-full border border-white bg-primary text-[10px] font-black text-primary-foreground shadow">💬</span>
        </a>
      ))}

      {ambientRobots.length === 0 && posts.length === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 text-center text-sm font-bold text-muted-foreground">
          この場所の壁画を準備しています。
        </div>
      )}
    </div>
  )
}
