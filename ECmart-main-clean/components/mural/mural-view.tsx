"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import type { CartApi } from "@/lib/use-cart"
import type { SavedRobot } from "@/lib/types"
import { useAccount } from "@/lib/account-context"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { normalizeRobotHeldItem } from "@/lib/robot-held-item"
import { MURORAN_SPOTS, getMuroranSpot, getSpotProducts, getSpotShop, type MuroranSpot } from "@/lib/mural-spots"
import { generateAmbientMuralRobots, localMuralDateKey, type AmbientMuralRobot } from "@/lib/mural-npc"
import {
  clampMuralPositionX,
  clampMuralPositionY,
  clampMuralRotation,
  clampMuralScale,
  isMissingMuralStorage,
  MURAL_REVIEW_MAX_LENGTH,
  parseMuralPostRow,
  sanitizeMuralReview,
  type MuralPost,
} from "@/lib/mural-model"
import { RobotCharacter } from "@/components/robot/robot-character"
import { ProductCard } from "@/components/product-card"
import { MuroranMiniMap } from "@/components/mural/muroran-mini-map"
import { MuralBackground } from "@/components/mural/mural-background"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Bot,
  ChevronLeft,
  Heart,
  LoaderCircle,
  MapPinned,
  MessageCircle,
  MousePointer2,
  RotateCcw,
  Send,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  UserRound,
} from "lucide-react"
import { cn } from "@/lib/utils"

const MURAL_POST_SELECT = "id,user_id,spot_id,saved_robot_id,author_name,robot_name,robot_config,custom_item_document,review,position_x,position_y,scale,rotation_deg,created_at,updated_at"

type Notice = { type: "error" | "success"; text: string } | null
type ReviewSort = "new" | "popular"

type SelectedMuralEntry =
  | { kind: "post"; post: MuralPost }
  | { kind: "ambient"; robot: AmbientMuralRobot }
  | null

function navigateTo(tab: "account" | "robot" | "shops") {
  window.dispatchEvent(new CustomEvent("machinowa:navigate", { detail: { tab } }))
}

function dateLabel(value: string) {
  try {
    return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value))
  } catch {
    return value
  }
}

function MuralRobotMarker({
  config,
  customItemDocument,
  x,
  y,
  scale,
  rotationDeg,
  generated,
  review,
  selected,
  onClick,
}: {
  config: MuralPost["robotConfig"]
  customItemDocument?: MuralPost["customItemDocument"]
  x: number
  y: number
  scale: number
  rotationDeg: number
  generated: boolean
  review?: string
  selected?: boolean
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group absolute z-10 h-[34%] min-h-28 w-[19%] min-w-24 max-w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl outline-none transition-[filter] hover:z-20 hover:drop-shadow-xl focus-visible:z-20 focus-visible:ring-4 focus-visible:ring-white/70",
        selected && "z-30 ring-4 ring-primary/70",
      )}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) rotate(${rotationDeg}deg) scale(${scale})`,
        transformOrigin: "50% 82%",
      }}
      aria-label={generated ? `${config.name}（自動生成）` : `${config.name}のレビューを見る`}
    >
      <RobotCharacter config={config} customItemDocument={customItemDocument} className="h-full w-full overflow-visible" />
      {generated ? (
        <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/60 bg-background/80 px-2 py-0.5 text-[9px] font-bold opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
          街のロボット
        </span>
      ) : (
        <span className="absolute right-[4%] top-[7%] flex size-6 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-md">
          <MessageCircle className="size-3.5" />
          <span className="sr-only">レビューあり</span>
        </span>
      )}
      {!generated && review && (
        <span className="absolute bottom-[4%] left-1/2 max-w-[145%] -translate-x-1/2 truncate rounded-full border border-white/70 bg-background/88 px-2 py-1 text-[9px] font-bold opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
          {review}
        </span>
      )}
    </button>
  )
}

function RobotChoice({ robot, selected, onClick }: { robot: SavedRobot; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-2xl border-2 p-2 text-left transition",
        selected ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/40",
      )}
    >
      <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
        <RobotCharacter config={{ ...robot.config, view: "front" }} className="h-full w-full" />
      </div>
      <div className="min-w-0">
        <div className="truncate font-bold">{robot.name}</div>
        <div className="text-xs text-muted-foreground">{robot.config.base === "volta" ? "ボルタ" : "ナッティ"}</div>
      </div>
    </button>
  )
}

export function MuralView({ cart }: { cart: CartApi }) {
  const account = useAccount()
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [selectedSpotId, setSelectedSpotId] = useState(MURORAN_SPOTS[0].id)
  const [posts, setPosts] = useState<MuralPost[]>([])
  const [mapCounts, setMapCounts] = useState<Record<string, number>>({})
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(() => new Set())
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [storageReady, setStorageReady] = useState(true)
  const [storageMessage, setStorageMessage] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<SelectedMuralEntry>(null)
  const [selectedRobotId, setSelectedRobotId] = useState<string>("")
  const [review, setReview] = useState("")
  const [placement, setPlacement] = useState<{ x: number; y: number } | null>(null)
  const [draftScale, setDraftScale] = useState(0.9)
  const [draftRotation, setDraftRotation] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [reviewSort, setReviewSort] = useState<ReviewSort>("new")
  const [authorUserId, setAuthorUserId] = useState<string | null>(null)
  const [authorName, setAuthorName] = useState("")
  const [authorPosts, setAuthorPosts] = useState<MuralPost[]>([])
  const [loadingAuthor, setLoadingAuthor] = useState(false)

  const selectedSpot = getMuroranSpot(selectedSpotId) ?? MURORAN_SPOTS[0]
  const selectedRobot = account.savedRobots.find((robot) => robot.id === selectedRobotId) ?? null
  const relatedShop = getSpotShop(selectedSpot)
  const relatedProducts = getSpotProducts(selectedSpot)

  useEffect(() => {
    const fromUrl = new URL(window.location.href).searchParams.get("spot")
    if (fromUrl && getMuroranSpot(fromUrl)) setSelectedSpotId(fromUrl)
  }, [])

  useEffect(() => {
    if (!selectedRobotId && account.savedRobots.length > 0) setSelectedRobotId(account.savedRobots[0].id)
    if (selectedRobotId && !account.savedRobots.some((robot) => robot.id === selectedRobotId)) {
      setSelectedRobotId(account.savedRobots[0]?.id ?? "")
    }
  }, [account.savedRobots, selectedRobotId])

  const loadMapCounts = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const supabase = await createClient()
      if (!supabase) return
      const { data, error } = await supabase.from("mural_posts").select("id,spot_id").limit(1000)
      if (error) {
        if (isMissingMuralStorage(error)) {
          setStorageReady(false)
          setStorageMessage("壁画共有用のSupabase設定がまだ完了していません。supabase/mural-community-migration.sql を実行してください。")
        }
        return
      }
      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        if (!row || typeof row.spot_id !== "string" || !getMuroranSpot(row.spot_id)) continue
        counts[row.spot_id] = (counts[row.spot_id] ?? 0) + 1
      }
      setMapCounts(counts)
      setStorageReady(true)
      setStorageMessage(null)
    } catch {
      // NPC-only display remains usable when public sharing is temporarily unavailable.
    }
  }, [])

  const loadSpotPosts = useCallback(async (spotId: string) => {
    setLoadingPosts(true)
    setSelectedEntry(null)
    if (!isSupabaseConfigured) {
      setPosts([])
      setLoadingPosts(false)
      return
    }
    try {
      const supabase = await createClient()
      if (!supabase) {
        setPosts([])
        return
      }
      const { data, error } = await supabase
        .from("mural_posts")
        .select(MURAL_POST_SELECT)
        .eq("spot_id", spotId)
        .order("created_at", { ascending: false })
        .limit(120)
      if (error) {
        if (isMissingMuralStorage(error)) {
          setStorageReady(false)
          setStorageMessage("壁画共有用のSupabase設定がまだ完了していません。supabase/mural-community-migration.sql を実行してください。")
        }
        setPosts([])
        return
      }
      const parsed = (data ?? []).map((row) => parseMuralPostRow(row)).filter((post): post is MuralPost => Boolean(post))
      setPosts(parsed)
      setStorageReady(true)
      setStorageMessage(null)

      const ids = parsed.map((post) => post.id)
      if (ids.length === 0) {
        setLikeCounts({})
        setLikedPostIds(new Set())
        return
      }
      const { data: likesData } = await supabase.rpc("get_mural_like_counts", { target_spot_id: spotId })
      const counts: Record<string, number> = {}
      const liked = new Set<string>()
      for (const row of likesData ?? []) {
        if (!row || typeof row.post_id !== "string") continue
        const rawCount = typeof row.like_count === "number" ? row.like_count : Number(row.like_count)
        counts[row.post_id] = Number.isFinite(rawCount) ? Math.max(0, Math.floor(rawCount)) : 0
        if (row.liked_by_me === true) liked.add(row.post_id)
      }
      setLikeCounts(counts)
      setLikedPostIds(liked)
    } catch {
      setPosts([])
    } finally {
      setLoadingPosts(false)
    }
  }, [account.user])

  useEffect(() => {
    void loadMapCounts()
  }, [loadMapCounts])

  useEffect(() => {
    void loadSpotPosts(selectedSpotId)
  }, [loadSpotPosts, selectedSpotId])

  const ambientRobots = useMemo(
    () => generateAmbientMuralRobots(
      selectedSpot,
      posts.length,
      posts.map((post) => ({ x: post.positionX, y: post.positionY })),
      localMuralDateKey(),
    ),
    [posts, selectedSpot],
  )

  const sortedReviews = useMemo(() => {
    const result = [...posts]
    if (reviewSort === "popular") {
      result.sort((a, b) => (likeCounts[b.id] ?? 0) - (likeCounts[a.id] ?? 0) || b.createdAt.localeCompare(a.createdAt))
    } else {
      result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
    return result
  }, [likeCounts, posts, reviewSort])

  function selectSpot(spot: MuroranSpot) {
    setSelectedSpotId(spot.id)
    setPlacement(null)
    setNotice(null)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", "mural")
    url.searchParams.set("spot", spot.id)
    window.history.replaceState({ tab: "mural" }, "", url)
    requestAnimationFrame(() => document.getElementById("spot-mural")?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  function customItemForRobot(robot: SavedRobot | null) {
    if (!robot) return null
    const held = normalizeRobotHeldItem(robot.config.heldItem, robot.config.item)
    return held.kind === "custom"
      ? account.savedCustomItems.find((item) => item.id === held.customItemId)?.document ?? null
      : null
  }

  function choosePlacement(event: MouseEvent<HTMLDivElement>) {
    if (!selectedRobot || event.defaultPrevented) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = clampMuralPositionX(((event.clientX - rect.left) / rect.width) * 100)
    const y = clampMuralPositionY(((event.clientY - rect.top) / rect.height) * 100)
    setPlacement({ x, y })
    setNotice(null)
  }

  async function submitPost() {
    setNotice(null)
    if (!account.user) {
      setNotice({ type: "error", text: "壁画への投稿にはログインが必要です。" })
      return
    }
    if (!storageReady) {
      setNotice({ type: "error", text: storageMessage ?? "壁画共有用のSupabase設定を確認してください。" })
      return
    }
    if (!selectedRobot) {
      setNotice({ type: "error", text: "投稿するボルタ／ナッティを選んでください。" })
      return
    }
    const cleanReview = sanitizeMuralReview(review)
    if (!cleanReview) {
      setNotice({ type: "error", text: "この場所についてのレビューやひとことを入力してください。" })
      return
    }
    if (!placement) {
      setNotice({ type: "error", text: "壁画をクリックして、ロボットを置く場所を決めてください。" })
      return
    }

    setSubmitting(true)
    try {
      const supabase = await createClient()
      if (!supabase) {
        setNotice({ type: "error", text: "Supabaseへ接続できませんでした。" })
        return
      }
      const payload = {
        user_id: account.user.id,
        spot_id: selectedSpot.id,
        saved_robot_id: selectedRobot.id,
        author_name: (account.profile?.display_name || "マチノワユーザー").slice(0, 40),
        robot_name: selectedRobot.name.slice(0, 40),
        robot_config: selectedRobot.config,
        custom_item_document: customItemForRobot(selectedRobot),
        review: cleanReview,
        position_x: placement.x,
        position_y: placement.y,
        scale: clampMuralScale(draftScale),
        rotation_deg: clampMuralRotation(draftRotation),
      }
      const { data, error } = await supabase.from("mural_posts").insert(payload).select(MURAL_POST_SELECT).single()
      if (error) {
        if (error.code === "23505") {
          setNotice({ type: "error", text: "このロボットはすでにこの場所の壁画へ投稿されています。別のロボットを選ぶか、既存投稿を削除してください。" })
        } else if (isMissingMuralStorage(error)) {
          setStorageReady(false)
          setStorageMessage("supabase/mural-community-migration.sql を実行してください。")
          setNotice({ type: "error", text: "壁画共有用のSupabase設定がまだ完了していません。" })
        } else {
          setNotice({ type: "error", text: `投稿できませんでした：${error.message}` })
        }
        return
      }
      const post = parseMuralPostRow(data)
      if (!post) {
        setNotice({ type: "error", text: "保存した壁画投稿を読み取れませんでした。" })
        return
      }
      setPosts((current) => [post, ...current])
      setMapCounts((current) => ({ ...current, [selectedSpot.id]: (current[selectedSpot.id] ?? 0) + 1 }))
      setReview("")
      setPlacement(null)
      setDraftScale(0.9)
      setDraftRotation(0)
      setNotice({ type: "success", text: `${selectedRobot.name}を${selectedSpot.name}の壁画へ飾りました。` })
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleLike(post: MuralPost) {
    if (!account.user) {
      setSelectedEntry(null)
      navigateTo("account")
      return
    }
    const supabase = await createClient()
    if (!supabase) return
    const liked = likedPostIds.has(post.id)
    if (liked) {
      const { error } = await supabase.from("mural_post_likes").delete().eq("post_id", post.id).eq("user_id", account.user.id)
      if (error) return
      setLikedPostIds((current) => {
        const next = new Set(current)
        next.delete(post.id)
        return next
      })
      setLikeCounts((current) => ({ ...current, [post.id]: Math.max(0, (current[post.id] ?? 1) - 1) }))
    } else {
      const { error } = await supabase.from("mural_post_likes").insert({ post_id: post.id, user_id: account.user.id })
      if (error) {
        if (error.code === "23505") {
          setLikedPostIds((current) => new Set(current).add(post.id))
        }
        return
      }
      setLikedPostIds((current) => new Set(current).add(post.id))
      setLikeCounts((current) => ({ ...current, [post.id]: (current[post.id] ?? 0) + 1 }))
    }
  }

  async function deletePost(post: MuralPost) {
    if (!account.user || post.userId !== account.user.id) return
    if (!window.confirm(`${selectedSpot.name}から「${post.robotName}」の投稿を削除しますか？`)) return
    const supabase = await createClient()
    if (!supabase) return
    const { error } = await supabase.from("mural_posts").delete().eq("id", post.id).eq("user_id", account.user.id)
    if (error) return
    setPosts((current) => current.filter((entry) => entry.id !== post.id))
    setMapCounts((current) => ({ ...current, [post.spotId]: Math.max(0, (current[post.spotId] ?? 1) - 1) }))
    setSelectedEntry(null)
  }

  async function openAuthor(post: MuralPost) {
    setSelectedEntry(null)
    setAuthorUserId(post.userId)
    setAuthorName(post.authorName)
    setLoadingAuthor(true)
    setAuthorPosts([])
    try {
      const supabase = await createClient()
      if (!supabase) return
      const { data } = await supabase.from("mural_posts").select(MURAL_POST_SELECT).eq("user_id", post.userId).order("created_at", { ascending: false }).limit(60)
      const parsed = (data ?? []).map((row) => parseMuralPostRow(row)).filter((entry): entry is MuralPost => Boolean(entry))
      setAuthorPosts(parsed)
    } finally {
      setLoadingAuthor(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="flex flex-col gap-4">
          <Badge className="w-fit rounded-full">Phase 5 / まち歩き</Badge>
          <div>
            <h1 className="font-display text-3xl font-black sm:text-4xl">室蘭マップと、みんなの壁画</h1>
            <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
              室蘭のスポットを選ぶと、その場所だけの壁画とみんなのレビューが開きます。投稿が少ない場所では「街のボルタ・ナッティ」が日替わりで登場します。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="rounded-full"><MessageCircle className="mr-1 size-3" />吹き出し付き = ユーザー投稿</Badge>
            <Badge variant="outline" className="rounded-full"><Sparkles className="mr-1 size-3" />街のロボット = 自動生成</Badge>
          </div>
        </div>
        <MuroranMiniMap selectedSpotId={selectedSpot.id} counts={mapCounts} onSelect={selectSpot} />
      </section>

      {!isSupabaseConfigured && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase未設定のため、現在は「街のボルタ・ナッティ」だけで壁画をプレビューしています。共有投稿を使うには既存のSupabase設定を有効にしてください。
        </div>
      )}
      {storageMessage && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{storageMessage}</div>
      )}

      <section id="spot-mural" className="scroll-mt-24 flex flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-3xl border-2 bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-3xl">{selectedSpot.emoji}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-black">{selectedSpot.name}</h2>
                <Badge variant="secondary" className="rounded-full">{selectedSpot.area}</Badge>
                {relatedShop && <Badge className="rounded-full"><Store className="mr-1 size-3" />店舗</Badge>}
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{selectedSpot.description}</p>
              <div className="mt-3 font-bold text-primary">{selectedSpot.muralTitle}</div>
              <p className="mt-1 text-sm text-muted-foreground">{selectedSpot.muralSubtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2 text-xs">
            <Badge variant="outline" className="rounded-full">投稿 {posts.length}</Badge>
            <Badge variant="outline" className="rounded-full">街のロボット {ambientRobots.length}</Badge>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="flex flex-col gap-3">
            <div
              ref={stageRef}
              onClick={choosePlacement}
              className={cn(
                "relative aspect-[16/9] min-h-[330px] overflow-hidden rounded-3xl border-4 border-[#6c5c50] bg-muted shadow-inner",
                selectedRobot && "cursor-crosshair",
              )}
              aria-label={`${selectedSpot.name}の壁画`}
            >
              <MuralBackground spot={selectedSpot} />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex items-start justify-between gap-3 bg-gradient-to-b from-black/36 to-transparent p-4 text-white">
                <div>
                  <div className="font-display text-lg font-black drop-shadow">{selectedSpot.name}</div>
                  <div className="text-xs font-bold opacity-90">みんなでつくる場所限定壁画</div>
                </div>
                {selectedRobot && <span className="rounded-full bg-black/30 px-3 py-1 text-[11px] font-bold backdrop-blur">壁をクリックして投稿位置を選択</span>}
              </div>

              {ambientRobots.map((robot) => (
                <MuralRobotMarker
                  key={robot.id}
                  config={robot.config}
                  x={robot.positionX}
                  y={robot.positionY}
                  scale={robot.scale}
                  rotationDeg={robot.rotationDeg}
                  generated
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedEntry({ kind: "ambient", robot })
                  }}
                />
              ))}

              {posts.map((post) => (
                <MuralRobotMarker
                  key={post.id}
                  config={post.robotConfig}
                  customItemDocument={post.customItemDocument}
                  x={post.positionX}
                  y={post.positionY}
                  scale={post.scale}
                  rotationDeg={post.rotationDeg}
                  generated={false}
                  review={post.review}
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedEntry({ kind: "post", post })
                  }}
                />
              ))}

              {selectedRobot && placement && (
                <div className="pointer-events-none absolute z-40 h-[34%] min-h-28 w-[19%] min-w-24 max-w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl ring-4 ring-primary/75" style={{ left: `${placement.x}%`, top: `${placement.y}%`, transform: `translate(-50%, -50%) rotate(${draftRotation}deg) scale(${draftScale})`, transformOrigin: "50% 82%" }}>
                  <RobotCharacter config={selectedRobot.config} customItemDocument={customItemForRobot(selectedRobot)} className="h-full w-full overflow-visible opacity-85" />
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-1 text-[9px] font-black text-primary-foreground shadow">投稿予定</span>
                </div>
              )}

              {loadingPosts && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/35 backdrop-blur-[1px]">
                  <span className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-bold shadow"><LoaderCircle className="size-4 animate-spin" />壁画を読み込み中</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">街のロボットは実ユーザーのレビューではありません。日付とスポットから同じ日の配置を固定生成し、実投稿が増えるほど人数が減ります。</p>
          </div>

          <Card className="h-fit border-2">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2"><Send className="size-5 text-primary" />この場所に残す</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!account.user ? (
                <div className="rounded-2xl bg-muted p-4 text-sm">
                  <div className="font-bold">レビュー投稿にはログインが必要です。</div>
                  <p className="mt-1 text-muted-foreground">保存したボルタ／ナッティをレビューのアバターとして壁画に置けます。</p>
                  <Button className="mt-3 w-full rounded-full" onClick={() => navigateTo("account")}><UserRound data-icon="inline-start" />ログイン</Button>
                </div>
              ) : account.savedRobots.length === 0 ? (
                <div className="rounded-2xl bg-muted p-4 text-sm">
                  <div className="font-bold">まずロボットを1体保存しましょう。</div>
                  <p className="mt-1 text-muted-foreground">工房で作ったロボットが、そのまま壁画レビューになります。</p>
                  <Button className="mt-3 w-full rounded-full" onClick={() => navigateTo("robot")}><Bot data-icon="inline-start" />ロボット工房へ</Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Label>投稿するロボット</Label>
                    <div className="grid max-h-44 gap-2 overflow-y-auto pr-1">
                      {account.savedRobots.map((robot) => <RobotChoice key={robot.id} robot={robot} selected={robot.id === selectedRobotId} onClick={() => { setSelectedRobotId(robot.id); setPlacement(null) }} />)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2"><Label htmlFor="mural-review">レビュー・ひとこと</Label><span className="text-[11px] text-muted-foreground">{review.length}/{MURAL_REVIEW_MAX_LENGTH}</span></div>
                    <textarea
                      id="mural-review"
                      value={review}
                      onChange={(event) => setReview(event.target.value.slice(0, MURAL_REVIEW_MAX_LENGTH))}
                      className="min-h-24 resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                      placeholder={`${selectedSpot.name}で感じたこと、食べたもの、思い出など`}
                    />
                  </div>

                  <div className="rounded-2xl border bg-muted/40 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-sm font-bold"><MousePointer2 className="size-4" />配置</span>
                      <span className="text-xs text-muted-foreground">{placement ? `X ${Math.round(placement.x)} / Y ${Math.round(placement.y)}` : "壁画をクリック"}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div>
                        <div className="mb-1 flex justify-between text-xs"><span>大きさ</span><span>{Math.round(draftScale * 100)}%</span></div>
                        <Slider value={[draftScale]} min={0.55} max={1.35} step={0.05} onValueChange={(value) => setDraftScale(Array.isArray(value) ? value[0] : Number(value))} />
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-xs"><span>傾き</span><span>{Math.round(draftRotation)}°</span></div>
                        <Slider value={[draftRotation]} min={-18} max={18} step={1} onValueChange={(value) => setDraftRotation(Array.isArray(value) ? value[0] : Number(value))} />
                      </div>
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setPlacement(null); setDraftScale(0.9); setDraftRotation(0) }}><RotateCcw data-icon="inline-start" />配置をリセット</Button>
                    </div>
                  </div>

                  {notice && <div className={cn("rounded-xl border px-3 py-2 text-sm", notice.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800")}>{notice.text}</div>}
                  <Button className="w-full rounded-full" disabled={submitting || !storageReady} onClick={() => void submitPost()}>{submitting ? <LoaderCircle className="animate-spin" /> : <Send />}壁画へ投稿</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-2">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="font-display">みんなのレビュー</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">壁画のユーザー投稿だけを一覧で読めます。</p>
            </div>
            <div className="flex gap-1 rounded-full bg-muted p-1">
              <Button size="sm" variant={reviewSort === "new" ? "default" : "ghost"} className="rounded-full" onClick={() => setReviewSort("new")}>新着</Button>
              <Button size="sm" variant={reviewSort === "popular" ? "default" : "ghost"} className="rounded-full" onClick={() => setReviewSort("popular")}>人気</Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {sortedReviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-7 text-center text-sm text-muted-foreground">まだユーザーのレビューはありません。最初の1体を壁画へ飾ってみましょう。</div>
            ) : sortedReviews.map((post) => (
              <button key={post.id} type="button" className="flex gap-3 rounded-2xl border p-3 text-left transition hover:border-primary/40 hover:bg-muted/40" onClick={() => setSelectedEntry({ kind: "post", post })}>
                <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted"><RobotCharacter config={{ ...post.robotConfig, view: "front" }} customItemDocument={post.customItemDocument} className="h-full w-full" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold">{post.authorName}</span><span className="text-xs text-muted-foreground">{dateLabel(post.createdAt)}</span></div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.review}</p>
                  <div className="mt-2 flex items-center gap-1 text-xs font-bold text-rose-600"><Heart className="size-3.5" fill={(likeCounts[post.id] ?? 0) > 0 ? "currentColor" : "none"} />{likeCounts[post.id] ?? 0}</div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">{relatedShop ? <Store className="size-5 text-primary" /> : <MapPinned className="size-5 text-primary" />}{relatedShop ? "この場所のお店・商品" : "スポット情報"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {relatedShop ? (
              <>
                <div className="rounded-2xl p-4" style={{ backgroundColor: `${relatedShop.color}1f` }}>
                  <div className="flex gap-3"><span className="text-4xl">{relatedShop.emoji}</span><div><div className="font-display text-lg font-black">{relatedShop.name}</div><div className="text-sm font-bold text-primary">{relatedShop.tagline}</div></div></div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{relatedShop.description}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {relatedProducts.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} cart={cart} />)}
                </div>
                <div className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">壁画から商品を見て、そのままこのデモECのカートへ追加できます。店頭限定表記の商品は実店舗向けのデモ表示です。</div>
              </>
            ) : (
              <>
                <div className="text-6xl">{selectedSpot.emoji}</div>
                <div className="font-display text-xl font-black">{selectedSpot.name}</div>
                <p className="text-sm leading-relaxed text-muted-foreground">{selectedSpot.description}</p>
                <div className="rounded-2xl bg-primary/10 p-4 text-sm"><div className="font-bold text-primary">場所限定デザイン</div><p className="mt-1 text-muted-foreground">{selectedSpot.muralSubtitle}</p></div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={selectedEntry !== null} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          {selectedEntry?.kind === "ambient" && (
            <>
              <DialogHeader>
                <Badge variant="secondary" className="w-fit rounded-full"><Sparkles className="mr-1 size-3" />自動生成</Badge>
                <DialogTitle className="font-display text-xl">{selectedEntry.robot.label}</DialogTitle>
                <DialogDescription>{selectedSpot.name}の壁画をにぎやかにしている「街のロボット」です。</DialogDescription>
              </DialogHeader>
              <div className="mx-auto h-64 w-52 overflow-hidden rounded-2xl bg-muted"><RobotCharacter config={selectedEntry.robot.config} className="h-full w-full" /></div>
              <div className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">このキャラクターは実ユーザーのレビューではありません。投稿数が少ない場所の寂しさを減らすため、スポットと日付をもとに自動生成しています。</div>
            </>
          )}
          {selectedEntry?.kind === "post" && (() => {
            const post = selectedEntry.post
            const liked = likedPostIds.has(post.id)
            const own = account.user?.id === post.userId
            return (
              <>
                <DialogHeader>
                  <div className="flex flex-wrap gap-2"><Badge className="w-fit rounded-full"><MessageCircle className="mr-1 size-3" />ユーザー投稿</Badge><Badge variant="outline" className="rounded-full">{selectedSpot.name}</Badge></div>
                  <DialogTitle className="font-display text-xl">{post.robotName}</DialogTitle>
                  <DialogDescription>{post.authorName}さんのレビュー ・ {dateLabel(post.createdAt)}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                  <div className="h-56 overflow-hidden rounded-2xl bg-muted"><RobotCharacter config={{ ...post.robotConfig, view: "front" }} customItemDocument={post.customItemDocument} className="h-full w-full" /></div>
                  <div className="flex flex-col gap-3">
                    <blockquote className="rounded-2xl bg-muted p-4 text-sm leading-relaxed">「{post.review}」</blockquote>
                    <Button variant={liked ? "default" : "outline"} className={cn("rounded-full", liked && "bg-rose-600 hover:bg-rose-500")} onClick={() => void toggleLike(post)}><Heart data-icon="inline-start" fill={liked ? "currentColor" : "none"} />{liked ? "いいね済み" : "いいね"}（{likeCounts[post.id] ?? 0}）</Button>
                    <Button variant="outline" className="rounded-full" onClick={() => void openAuthor(post)}><UserRound data-icon="inline-start" />{post.authorName}さんの投稿を見る</Button>
                    {own && <Button variant="destructive" className="rounded-full" onClick={() => void deletePost(post)}><Trash2 data-icon="inline-start" />この投稿を削除</Button>}
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={authorUserId !== null} onOpenChange={(open) => !open && setAuthorUserId(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <Badge variant="secondary" className="w-fit rounded-full"><UserRound className="mr-1 size-3" />壁画プロフィール</Badge>
            <DialogTitle className="font-display text-xl">{authorName}さん</DialogTitle>
            <DialogDescription>このユーザーが室蘭の壁画へ残したレビューをまとめて表示しています。</DialogDescription>
          </DialogHeader>
          {loadingAuthor ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />投稿を読み込み中</div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl bg-muted p-3 text-sm font-bold">公開壁画投稿 {authorPosts.length}件</div>
              {authorPosts.length === 0 ? <p className="text-sm text-muted-foreground">公開投稿を取得できませんでした。</p> : authorPosts.map((post) => {
                const spot = getMuroranSpot(post.spotId)
                return (
                  <button key={post.id} type="button" className="flex gap-3 rounded-2xl border p-3 text-left hover:bg-muted/40" onClick={() => { setAuthorUserId(null); selectSpot(spot ?? selectedSpot); window.setTimeout(() => setSelectedEntry({ kind: "post", post }), 350) }}>
                    <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted"><RobotCharacter config={{ ...post.robotConfig, view: "front" }} customItemDocument={post.customItemDocument} className="h-full w-full" /></div>
                    <div className="min-w-0"><div className="font-bold">{spot?.name ?? post.spotId}</div><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.review}</p></div>
                  </button>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
