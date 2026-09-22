"use client"

import { useEffect, useId, useState } from "react"
import { useAccount } from "@/lib/account-context"
import { createClient } from "@/lib/supabase/client"
import { communityError } from "@/lib/community-model"
import { communityRpc } from "@/lib/community-client"
import { MURAL_REVIEW_MAX_LENGTH, sanitizeMuralReview, type MuralPost } from "@/lib/mural-model"
import { Button } from "@/components/ui/button"

export function MuralReviewEditor({ post, onSaved }: { post: MuralPost; onSaved: (post: MuralPost) => void }) {
  const account = useAccount()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(post.review)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let alive = true
    void communityRpc<boolean>("community_is_hidden", { kind: "mural", target: post.id }).then((value) => { if (alive) setHidden(value) }).catch(() => {})
    return () => { alive = false }
  }, [post.id])
  async function save() {
    if (busy || !account.user || account.user.id !== post.userId || !text.trim()) return
    setBusy(true); setMessage("")
    try {
      const client = await createClient()
      if (!client) throw new Error("unconfigured")
      const { data, error } = await client.from("mural_posts").update({ review: sanitizeMuralReview(text) }).eq("id", post.id).eq("user_id", account.user.id).select("review,updated_at").single()
      if (error) throw error
      onSaved({ ...post, review: data.review, updatedAt: data.updated_at })
      setOpen(false); setMessage("レビューを更新しました。")
    } catch (e) { setMessage(communityError(e)) } finally { setBusy(false) }
  }
  return <div className="space-y-2">
    {hidden && <p className="rounded-lg border p-2 text-sm">管理者により非表示になっています。本人には表示されていますが、レビューを編集しても非表示は解除されません。</p>}
    <Button variant="outline" disabled={busy} onClick={() => { setOpen(!open); setText(post.review) }}>レビューを編集</Button>
    {open && <div className="space-y-2"><label htmlFor={id}>レビュー（{MURAL_REVIEW_MAX_LENGTH}文字以内）</label><textarea id={id} value={text} onChange={(e) => setText(e.target.value)} maxLength={MURAL_REVIEW_MAX_LENGTH} rows={5} disabled={busy} className="w-full rounded-lg border bg-background p-2" /><Button disabled={busy || !text.trim()} onClick={() => void save()}>{busy ? "保存中…" : "変更を保存"}</Button><Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>キャンセル</Button></div>}
    {message && <p role="status">{message}</p>}
  </div>
}
