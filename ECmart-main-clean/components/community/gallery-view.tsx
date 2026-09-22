"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAccount } from "@/lib/account-context"
import { communityRpc, loadGallery } from "@/lib/community-client"
import { communityError, GALLERY_PAGE_SIZE, UUID_PATTERN, type GalleryWork } from "@/lib/community-model"
import { DioramaScenePreview } from "@/components/diorama/diorama-scene"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ReportButton } from "./report-button"

export function GalleryView() {
  const account = useAccount()
  const [sort, setSort] = useState("new")
  const [author, setAuthor] = useState<string | null>(null)
  const [authorName, setAuthorName] = useState("")
  const [offset, setOffset] = useState(0)
  const [works, setWorks] = useState<GalleryWork[]>([])
  const [hasNext, setHasNext] = useState(false)
  const [selected, setSelected] = useState<GalleryWork | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [detailError, setDetailError] = useState("")
  const request = useRef(0)
  const detailRequest = useRef(0)
  const [initialized, setInitialized] = useState(false)
  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("author")
    if (a && UUID_PATTERN.test(a)) setAuthor(a)
    setInitialized(true)
    return () => { request.current++; detailRequest.current++ }
  }, [])
  const refresh = useCallback(async () => {
    const token = ++request.current
    setLoading(true); setError(""); setWorks([])
    try {
      const rows = await loadGallery({ sort, author, offset })
      if (token !== request.current) return
      setWorks(rows.slice(0, GALLERY_PAGE_SIZE)); setHasNext(rows.length > GALLERY_PAGE_SIZE)
      if (author && rows[0]) setAuthorName(rows[0].authorName)
    } catch (e) { if (token === request.current) setError(communityError(e)) }
    finally { if (token === request.current) setLoading(false) }
  }, [sort, author, offset])
  useEffect(() => { if (initialized) void refresh() }, [refresh, initialized, account.user?.id])
  // Reload details after auth changes; no private/hidden snapshot fallback is used.
  useEffect(() => {
    if (!initialized) return
    const id = new URLSearchParams(window.location.search).get("work")
    if (!id) return
    if (!UUID_PATTERN.test(id)) { setError("作品のURLが正しくありません。"); return }
    void openWork(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, account.user?.id])
  async function openWork(id: string) {
    const token = ++detailRequest.current
    setError(""); setDetailError(""); setSelected(null)
    try {
      const rows = await loadGallery({ id })
      if (token !== detailRequest.current) return
      if (!rows[0]) { setError("この作品は非公開・削除、または管理者により非表示になっています。"); return }
      setSelected(rows[0])
      const url = new URL(window.location.href); url.searchParams.set("work", id); window.history.replaceState(null, "", url)
    } catch (e) { if (token === detailRequest.current) setError(communityError(e)) }
  }
  function closeWork() {
    detailRequest.current++; setSelected(null); setDetailError("")
    const url = new URL(window.location.href); url.searchParams.delete("work"); window.history.replaceState(null, "", url)
  }
  function filterAuthor(work: GalleryWork | null) {
    closeWork(); setAuthor(work?.userId ?? null); setAuthorName(work?.authorName ?? ""); setOffset(0)
    const url = new URL(window.location.href)
    if (work) url.searchParams.set("author", work.userId); else url.searchParams.delete("author")
    window.history.replaceState(null, "", url)
  }
  async function like(work: GalleryWork) {
    if (busy) return
    setBusy(true); setDetailError("")
    try {
      await communityRpc("set_diorama_like", { target_publication_id: work.id, desired: !work.likedByMe })
      const [updated] = await loadGallery({ id: work.id })
      if (!updated) { closeWork(); setError("作品は非公開または削除されました。"); return }
      setSelected((current) => current?.id === work.id ? updated : current)
      await refresh()
    } catch (e) { setDetailError(communityError(e)) } finally { setBusy(false) }
  }
  return <section className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="font-display text-3xl font-black">みんなのジオラマ</h1><p className="mt-2 text-muted-foreground">室蘭の風景に、ボルタとナッティの物語を。</p></div>
      <a href="/?tab=account" className="rounded-full border px-4 py-2 text-sm font-bold">マイページで作品を公開</a>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Button variant={sort === "new" ? "default" : "outline"} onClick={() => { setSort("new"); setOffset(0) }}>新着順</Button>
      <Button variant={sort === "popular" ? "default" : "outline"} onClick={() => { setSort("popular"); setOffset(0) }}>いいね順</Button>
      {author && <><span className="text-sm">{authorName || "この作者"}さんの公開作品</span><Button variant="ghost" onClick={() => filterAuthor(null)}>すべての作品へ</Button></>}
    </div>
    {loading ? <p role="status">作品を読み込み中…</p> : error ? <div role="alert" className="rounded-xl border p-4"><p>{error}</p><Button variant="outline" onClick={() => void refresh()}>再読み込み</Button></div> : works.length === 0 ? <div className="rounded-2xl border-2 border-dashed p-10 text-center"><h2 className="text-xl font-bold">公開作品はまだありません</h2><p className="mt-2">保存したジオラマを、マイページから公開できます。</p></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {works.map((work) => <article key={work.id} className="overflow-hidden rounded-2xl border-2 bg-card">
        <DioramaScenePreview document={work.snapshot.document} robots={work.snapshot.robots} customItems={work.snapshot.customItems} className="rounded-none border-0" />
        <div className="space-y-3 p-4"><h2 className="break-words text-lg font-bold">{work.title}</h2>
          <button className="text-sm underline" onClick={() => filterAuthor(work)}>{work.authorName}さん</button>
          <p className="text-sm text-muted-foreground">♡ {work.likeCount} · {new Date(work.publishedAt).toLocaleDateString("ja-JP")}</p>
          <Button variant="outline" className="w-full" onClick={() => void openWork(work.id)}>作品を見る</Button>
        </div>
      </article>)}
    </div>}
    <div className="flex items-center justify-center gap-3">
      <Button variant="outline" disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - GALLERY_PAGE_SIZE))}>前へ</Button>
      <span className="text-sm">{Math.floor(offset / GALLERY_PAGE_SIZE) + 1}ページ</span>
      <Button variant="outline" disabled={loading || !hasNext || !!error} onClick={() => setOffset(offset + GALLERY_PAGE_SIZE)}>次へ</Button>
    </div>
    <Dialog open={!!selected} onOpenChange={(open) => { if (!open) closeWork() }}>
      <DialogContent aria-label="ジオラマ作品の詳細" className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {selected && <><DialogHeader><DialogTitle className="pr-10 text-xl">{selected.title}</DialogTitle><DialogDescription>{selected.authorName}さん · 公開 {new Date(selected.publishedAt).toLocaleDateString("ja-JP")} · 更新 {new Date(selected.updatedAt).toLocaleDateString("ja-JP")}</DialogDescription></DialogHeader>
          <DioramaScenePreview document={selected.snapshot.document} robots={selected.snapshot.robots} customItems={selected.snapshot.customItems} />
          <p className="whitespace-pre-wrap break-words text-base">{selected.description || "説明はありません。"}</p>
          <div className="flex flex-wrap gap-2">{account.user ? <Button disabled={busy} variant={selected.likedByMe ? "default" : "outline"} onClick={() => void like(selected)}>{selected.likedByMe ? "♥ いいね済み" : "♡ いいね"} ({selected.likeCount})</Button> : <a href="/?tab=account" className="rounded-lg border px-4 py-2">ログインしていいね ({selected.likeCount})</a>}
            <Button variant="outline" onClick={() => filterAuthor(selected)}>作者の作品一覧</Button>
          </div>
          {detailError && <p role="alert">{detailError}</p>}
          {account.user?.id !== selected.userId && <ReportButton key={selected.id} kind="diorama" targetId={selected.id} />}
        </>}
      </DialogContent>
    </Dialog>
  </section>
}
