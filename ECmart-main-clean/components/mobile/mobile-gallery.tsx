import { mobileCommunityRpc } from "@/lib/mobile-server"
import { communityError, parseGalleryWork, UUID_PATTERN, GALLERY_PAGE_SIZE } from "@/lib/community-model"
import { DioramaScenePreview } from "@/components/diorama/diorama-scene"

const linkClass = "inline-flex min-h-10 items-center justify-center rounded-full border px-4 py-2 text-sm font-bold"
function href(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams({ tab: "gallery" })
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") search.set(key, String(value))
  return `/?${search}`
}
export async function MobileGallery({ params, userId }: { params: Record<string, string | string[] | undefined>; userId?: string }) {
  const one = (key: string) => { const v = params[key]; return Array.isArray(v) ? v[0] : v }
  const rawAuthor = one("author"), rawWork = one("work")
  if ((rawAuthor && !UUID_PATTERN.test(rawAuthor)) || (rawWork && !UUID_PATTERN.test(rawWork))) return <p role="alert">作品のURLが正しくありません。</p>
  const author = rawAuthor || undefined, workId = rawWork || undefined
  const sort = one("sort") === "popular" ? "popular" : "new"
  const page = Math.min(10000, Math.max(0, Math.floor(Number(one("page")) || 0)))
  let rows
  try {
    const result = await mobileCommunityRpc<unknown[]>("list_diorama_gallery", { sort_order: sort, author_id: author ?? null, work_id: workId ?? null, page_size: GALLERY_PAGE_SIZE + 1, page_offset: workId ? 0 : page * GALLERY_PAGE_SIZE })
    rows = (result ?? []).map(parseGalleryWork).filter((r) => r !== null)
  } catch (e) { return <div role="alert" className="space-y-4"><h1 className="text-2xl font-bold">みんなのジオラマ</h1><p>{communityError(e)}</p><a className={linkClass} href={href({})}>再読み込み</a></div> }
  const hasNext = rows.length > GALLERY_PAGE_SIZE
  const returnTo = href({ work: workId, author, sort, page })
  return <section className="space-y-5">
    <h1 className="font-display text-2xl font-black">みんなのジオラマ</h1>
    {one("communityMessage") && <p role="status" className="rounded-xl border p-3">{one("communityMessage")}</p>}
    <div className="flex flex-wrap gap-2"><a className={linkClass} href={href({ author })}>新着順</a><a className={linkClass} href={href({ author, sort: "popular" })}>いいね順</a>{(author || workId) && <a className={linkClass} href={href({})}>すべての作品へ</a>}</div>
    {author && <h2 className="text-lg font-bold">{rows[0]?.authorName ?? "この作者"}さんの公開作品</h2>}
    {rows.length === 0 && <p>{workId ? "この作品は非公開・削除、または管理者により非表示になっています。" : "公開作品はまだありません。"}</p>}
    <div className="grid gap-5 sm:grid-cols-2">{rows.slice(0, GALLERY_PAGE_SIZE).map((work) => <article key={work.id} className={`space-y-3 rounded-2xl border-2 p-3 ${workId ? "sm:col-span-2" : ""}`}>
      <DioramaScenePreview document={work.snapshot.document} robots={work.snapshot.robots} customItems={work.snapshot.customItems} />
      <h2 className="break-words text-xl font-bold">{work.title}</h2>
      <a className="text-sm underline" href={href({ author: work.userId })}>{work.authorName}さんの作品一覧</a>
      <p className="text-sm text-muted-foreground">公開 {new Date(work.publishedAt).toLocaleDateString("ja-JP")} · ♡ {work.likeCount}</p>
      {!workId ? <a className={linkClass} href={href({ work: work.id })}>作品を見る</a> : <>
        <p className="whitespace-pre-wrap break-words">{work.description || "説明はありません。"}</p>
        {userId ? <form action="/api/mobile/community" method="post">
          <input type="hidden" name="action" value="like" /><input type="hidden" name="targetId" value={work.id} /><input type="hidden" name="desired" value={work.likedByMe ? "false" : "true"} /><input type="hidden" name="returnTo" value={returnTo} />
          <button className={linkClass} type="submit">{work.likedByMe ? "♥ いいねを取り消す" : "♡ いいね"}</button>
        </form> : <a className={linkClass} href="/?tab=account">ログインしていいね・通報</a>}
        {userId && userId !== work.userId && <details className="rounded-xl border p-3"><summary>作品を通報</summary><form action="/api/mobile/community" method="post" className="mt-3 space-y-3">
          <input type="hidden" name="action" value="report" /><input type="hidden" name="targetId" value={work.id} /><input type="hidden" name="returnTo" value={returnTo} />
          <label className="block">通報理由（500文字以内）<textarea name="reason" required maxLength={500} rows={3} className="mt-2 w-full rounded-lg border bg-background p-2" /></label>
          <p className="text-sm">理由は公開されません。管理者が確認します。</p><button className={linkClass} type="submit">通報を送信</button>
        </form></details>}
      </>}
    </article>)}</div>
    {!workId && <div className="flex items-center gap-3">{page > 0 && <a className={linkClass} href={href({ author, sort, page: page - 1 })}>前へ</a>}<span>{page + 1}ページ</span>{hasNext && <a className={linkClass} href={href({ author, sort, page: page + 1 })}>次へ</a>}</div>}
    <p className="text-sm text-muted-foreground">作品の制作・公開設定はPC版のマイページで行えます。</p>
  </section>
}
