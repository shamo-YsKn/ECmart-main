"use client"

import { useCallback, useEffect, useId, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAccount } from "@/lib/account-context"
import { communityRpc } from "@/lib/community-client"
import { communityError } from "@/lib/community-model"
import type { SavedDiorama } from "@/lib/diorama-model"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Publication = { id: string; title: string; description: string; is_public: boolean; updated_at: string }
export function PublicationControls({ diorama }: { diorama: SavedDiorama }) {
  const account = useAccount()
  const inputId = useId()
  const [publication, setPublication] = useState<Publication | null>(null)
  const [hidden, setHidden] = useState(false)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState(diorama.name)
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const load = useCallback(async () => {
    setLoading(true); setError("")
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const client = await createClient()
      if (!client || !account.user) throw { code: "P0001", message: "ログインして再度お試しください。" }
      const result = await client.from("diorama_publications").select("id,title,description,is_public,updated_at").eq("diorama_id", diorama.id).eq("user_id", account.user.id).abortSignal(controller.signal).maybeSingle()
      if (result.error) throw result.error
      const p = result.data as Publication | null
      const isHidden = p ? await communityRpc<boolean>("community_is_hidden", { kind: "diorama", target: p.id }) : false
      setPublication(p); setHidden(isHidden); setTitle(p?.title ?? diorama.name); setDescription(p?.description ?? "")
    } catch (e) { setError(communityError(e)) } finally { clearTimeout(timer); setLoading(false) }
  }, [account.user, diorama.id, diorama.name])
  useEffect(() => { void load() }, [load])
  async function update(publish: boolean) {
    if (busy) return
    if (!window.confirm(publish ? "保存済みの作品・ロボット・持ち物の現在の状態を公開します。よろしいですか？" : "ギャラリーから非公開にしますか？保存した制作データは残ります。")) return
    setBusy(true); setError(""); setMessage("")
    try {
      if (publish) await communityRpc("publish_diorama", { target_diorama_id: diorama.id, work_title: title.trim(), work_description: description.trim() })
      else await communityRpc("unpublish_diorama", { target_diorama_id: diorama.id })
      await load(); setOpen(false); setMessage(publish ? "公開内容を保存しました。" : "非公開にしました。")
    } catch (e) { setError(communityError(e)) } finally { setBusy(false) }
  }
  return <div className="space-y-2 border-t pt-3 text-sm">
    <p className="font-bold">{loading ? "公開状態を確認中…" : error && !publication ? "公開状態を確認できません" : hidden ? "管理者により非表示" : publication?.is_public ? "公開中" : "非公開"}</p>
    {hidden && <p>管理者の確認後に再表示されます。作者側では解除できません。</p>}
    {!loading && <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={busy || hidden || !!error} onClick={() => setOpen(!open)}>{publication?.is_public ? "公開内容を更新する" : "公開設定"}</Button>
      {publication?.is_public && <Button size="sm" variant="outline" disabled={busy} onClick={() => void update(false)}>非公開に戻す</Button>}
      {publication?.is_public && !hidden && <a className="self-center underline" href={`/?tab=gallery&work=${publication.id}`}>公開作品を見る</a>}
    </div>}
    {open && <div className="space-y-3 rounded-xl bg-muted p-3">
      <p>全員に公開されます。工房での編集は自動反映されません。先に工房の変更を保存してください。</p>
      <label className="block" htmlFor={`${inputId}-title`}>作品名</label>
      <Input id={`${inputId}-title`} maxLength={40} value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
      <label className="block" htmlFor={`${inputId}-description`}>説明（1000文字以内）</label>
      <textarea id={`${inputId}-description`} rows={4} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} className="w-full rounded-lg border bg-background p-2" />
      <Button disabled={busy || !title.trim()} onClick={() => void update(true)}>{busy ? "保存中…" : publication?.is_public ? "公開内容を更新する" : "公開する"}</Button>
    </div>}
    {error && <div role="alert"><p>{error}</p><Button size="sm" variant="ghost" disabled={busy || loading} onClick={() => void load()}>再読み込み</Button></div>}
    {message && <p role="status">{message}</p>}
  </div>
}
