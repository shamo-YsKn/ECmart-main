"use client"

import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAccount } from "@/lib/account-context"
import { communityRpc } from "@/lib/community-client"
import { communityError, type ContentKind } from "@/lib/community-model"

export function ReportButton({ kind, targetId }: { kind: ContentKind; targetId: string }) {
  const account = useAccount()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  async function report() {
    if (busy || !reason.trim()) return
    setBusy(true); setMessage("")
    try {
      await communityRpc("report_community_content", { kind, target: targetId, report_reason: reason.trim() })
      setMessage("通報を受け付けました。管理者が確認します。同じ投稿への重複通報はまとめられます。")
      setOpen(false); setReason("")
    } catch (error) { setMessage(communityError(error)) } finally { setBusy(false) }
  }
  return <div className="space-y-2 text-sm">
    {account.user ? <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} disabled={busy}>この投稿を通報</Button> : <a className="underline" href="/?tab=account">ログインして通報</a>}
    {open && <div className="space-y-2 rounded-xl border p-3">
      <label htmlFor={id}>通報理由（500文字以内）</label>
      <textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} className="w-full rounded-lg border bg-background p-2" />
      <p className="text-muted-foreground">理由は公開されません。通報だけで投稿が自動削除されることはありません。</p>
      <div className="flex gap-2"><Button disabled={busy || !reason.trim()} onClick={() => void report()}>{busy ? "送信中…" : "通報を送信"}</Button><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>キャンセル</Button></div>
    </div>}
    {message && <p role="status">{message}</p>}
  </div>
}
