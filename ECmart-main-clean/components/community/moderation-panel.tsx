"use client"

import { useEffect, useState } from "react"
import { useAccount } from "@/lib/account-context"
import { communityRpc } from "@/lib/community-client"
import { communityError, parsePublicationSnapshot, record } from "@/lib/community-model"
import { DioramaScenePreview } from "@/components/diorama/diorama-scene"
import { Button } from "@/components/ui/button"

type Report = { id: string; target_kind: string; target_id: string; reason: string; status: string; created_at: string; hidden: boolean; target_content: unknown }
export function ModerationPanel() {
  const account = useAccount()
  const [admin, setAdmin] = useState(false)
  const [open, setOpen] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const [status, setStatus] = useState("open")
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let alive = true; setAdmin(false); setReports([]); setOpen(false)
    if (account.user) void communityRpc<boolean>("is_community_moderator").then((value) => { if (alive) setAdmin(value) }).catch(() => {})
    return () => { alive = false }
  }, [account.user?.id])
  useEffect(() => {
    if (!open || !admin) return
    let alive = true; setLoading(true); setError(""); setReports([])
    void communityRpc<Report[]>("list_community_reports", { queue_status: status, page_offset: offset }).then((rows) => { if (alive) setReports(rows ?? []) }).catch((e) => { if (alive) setError(communityError(e)) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [open, admin, status, offset, revision])
  async function act(report: Report, action: string) {
    const reason = window.prompt("対応理由を入力してください（1〜500文字）。")
    if (!reason?.trim() || busy) return
    if (reason.trim().length > 500) { setError("対応理由は500文字以内で入力してください。"); return }
    if (!window.confirm(action === "hide" ? "この投稿を全体から非表示にしますか？" : action === "restore" ? "管理者による非表示を解除しますか？作者が非公開にした作品は公開されません。" : "この通報を対応不要として閉じますか？")) return
    setBusy(true); setError("")
    try { await communityRpc("moderate_community_report", { report_id: report.id, action, decision_reason: reason.trim() }); setRevision((v) => v + 1) }
    catch (e) { setError(communityError(e)) } finally { setBusy(false) }
  }
  if (!admin) return null
  return <section className="space-y-4 rounded-2xl border-2 p-4">
    <Button variant="outline" onClick={() => setOpen(!open)}>投稿管理（管理者）</Button>
    {open && <><div className="flex flex-wrap gap-2">{[["open", "未対応"], ["resolved", "対応済み"], ["dismissed", "対応不要"]].map(([key, label]) => <Button disabled={busy} key={key} variant={status === key ? "default" : "outline"} onClick={() => { setStatus(key); setOffset(0) }}>{label}</Button>)}</div>
      {error && <p role="alert">{error}</p>}
      {loading ? <p role="status">通報を確認中…</p> : reports.length === 0 ? <p>この状態の通報はありません。</p> : reports.map((report) => {
        const content = record(report.target_content)
        const snapshot = parsePublicationSnapshot(content?.snapshot)
        return <article key={report.id} className="space-y-3 rounded-xl border p-4">
          <h3 className="font-bold">{report.target_kind === "diorama" ? "ジオラマ" : "壁画レビュー"} · {report.hidden ? "非表示" : "非表示指定なし"}</h3>
          <p className="text-sm">通報日時：{new Date(report.created_at).toLocaleString("ja-JP")}</p>
          <p className="whitespace-pre-wrap break-words">通報理由：{report.reason}</p>
          {!content ? <p>対象の投稿は削除されています。</p> : <div className="space-y-2 rounded-xl bg-muted p-3">
            <h4 className="font-bold">{String(content.title ?? content.robot_name ?? "")} / {String(content.author_name ?? "")}</h4>
            <p className="whitespace-pre-wrap break-words">{String(content.description ?? content.review ?? "")}</p>
            {snapshot && <DioramaScenePreview document={snapshot.document} robots={snapshot.robots} customItems={snapshot.customItems} className="max-w-lg" />}
          </div>}
          <div className="flex flex-wrap gap-2"><Button disabled={busy || !content} variant="destructive" onClick={() => void act(report, report.hidden ? "restore" : "hide")}>{report.hidden ? "非表示を解除" : "投稿を非表示"}</Button><Button disabled={busy} variant="outline" onClick={() => void act(report, "dismiss")}>対応不要</Button></div>
        </article>
      })}
      <div className="flex gap-2"><Button disabled={busy || loading || offset === 0} variant="outline" onClick={() => setOffset(Math.max(0, offset - 20))}>前へ</Button><Button disabled={busy || loading || reports.length < 20} variant="outline" onClick={() => setOffset(offset + 20)}>次へ</Button><Button variant="ghost" disabled={busy || loading} onClick={() => setRevision((v) => v + 1)}>再読み込み</Button></div>
    </>}
  </section>
}
