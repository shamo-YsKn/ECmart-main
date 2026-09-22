// Runs the real migrations in an isolated PostgreSQL engine. No network or real user data.
import fs from "node:fs/promises"
import assert from "node:assert/strict"
import { PGlite } from "@electric-sql/pglite"

const db = new PGlite()
let checks = 0
const A = "10000000-0000-0000-0000-000000000001"
const B = "10000000-0000-0000-0000-000000000002"
const M = "10000000-0000-0000-0000-000000000003"
const D = "20000000-0000-0000-0000-000000000001"
const D2 = "20000000-0000-0000-0000-000000000002"
const R = "30000000-0000-0000-0000-000000000001"
const I = "40000000-0000-0000-0000-000000000001"
const OTHER = "40000000-0000-0000-0000-000000000002"
const POST = "50000000-0000-0000-0000-000000000001"
async function as(user, sql, params = []) {
  await db.exec(`reset role; set role ${user ? "authenticated" : "anon"};`)
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""])
  try { return (await db.query(sql, params)).rows } finally { await db.exec("reset role") }
}
function check(condition, name) { assert.ok(condition, name); checks++; console.log(`PASS ${name}`) }
async function denied(user, sql, params, name) {
  await assert.rejects(() => as(user, sql, params), undefined, name); checks++; console.log(`PASS ${name}`)
}
async function gallery(user, args = ["new", null, 0, 12, null]) { return as(user, "select * from public.list_diorama_gallery($1,$2,$3,$4,$5)", args) }
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table public.profiles(user_id uuid primary key references auth.users(id), display_name text);
    create table public.saved_robots(id uuid primary key, user_id uuid references auth.users(id), name text, config jsonb);
    alter table public.saved_robots enable row level security;
    grant select on public.saved_robots to authenticated;
    create policy robot_owner on public.saved_robots for select to authenticated using(user_id = auth.uid());
  `)
  for (const file of ["custom-items-migration.sql", "dioramas-migration.sql", "mural-community-migration.sql", "phase6-community-migration.sql"]) {
    const sql = (await fs.readFile(`supabase/${file}`, "utf8")).replace(/create extension if not exists pgcrypto;/g, "")
    await db.exec(sql)
  }
  await db.exec(await fs.readFile("supabase/phase6-community-migration.sql", "utf8"))
  check(true, "migration is re-runnable")
  await db.query("insert into auth.users values($1),($2),($3)", [A, B, M])
  await db.query("insert into public.profiles values($1,'作者A'),($2,'作者B')", [A,B])
  await db.query("insert into public.community_moderators values($1)", [M])
  const document = { schemaVersion: 1, kind: "diorama", name: "作品A", stage: { kind: "builtin", stageId: "workshop" }, robots: [{ placementId: "r1", savedRobotId: R, view: "side" }], items: [] }
  await db.query("insert into public.custom_items(id,user_id,name,document) values($1,$2,'持ち物',$3),($4,$5,'他人の秘密',$3)", [I,A, JSON.stringify({ parts: [], marker: "original-item" }),OTHER,B])
  await db.query("insert into public.saved_robots values($1,$2,'ロボット',$3)", [R,A,JSON.stringify({ bodyColor: "#ff0000", heldItem: { kind: "custom", customItemId: I } })])
  await db.query("insert into public.dioramas(id,user_id,name,document) values($1,$2,'作品A',$3),($4,$5,'秘密',$3)", [D,A,JSON.stringify(document),D2,B])
  check((await gallery(null)).length === 0, "draft is private by default")
  check((await as(B, "select * from public.dioramas where id=$1",[D])).length === 0, "private source RLS preserved")
  await denied(null, "select public.publish_diorama($1,'作品','説明')", [D], "anonymous cannot publish")
  await denied(B, "select public.publish_diorama($1,'作品','説明')", [D], "cannot publish another owner's draft")
  const [{ id: pub }] = await as(A, "select public.publish_diorama($1,'展示A','説明A') as id", [D])
  let rows = await gallery(null)
  check(rows.length === 1 && rows[0].author_name === "作者A", "anonymous gallery and server-owned author name")
  check(rows[0].snapshot.robots.length === 1 && rows[0].snapshot.customItems.length === 1 && rows[0].snapshot.customItems[0].id === I, "snapshot includes held items but not unrelated private assets")
  await db.query("update public.saved_robots set config=jsonb_set(config,'{bodyColor}','\"#0000ff\"') where id=$1",[R])
  await db.query("update public.dioramas set name='下書き変更' where id=$1",[D])
  rows = await gallery(null)
  check(rows[0].title === "展示A" && rows[0].snapshot.robots[0].config.bodyColor === "#ff0000", "draft and asset edits do not change published snapshot")
  const [{ id: updated }] = await as(A, "select public.publish_diorama($1,'展示A更新','説明更新') as id", [D])
  check(updated === pub && (await gallery(null))[0].snapshot.robots[0].config.bodyColor === "#0000ff", "explicit publication update retains identity")
  await denied(B, "update public.diorama_publications set is_public=false where id=$1",[pub], "direct publication mutation denied")
  await denied(A, "update public.diorama_publications set snapshot='{}' where id=$1",[pub], "even owner cannot inject arbitrary snapshot")
  await as(B, "select public.set_diorama_like($1,true)",[pub]); await as(B, "select public.set_diorama_like($1,true)",[pub])
  check(Number((await gallery(B))[0].like_count) === 1 && (await gallery(B))[0].liked_by_me, "repeated like is idempotent")
  check(!(await gallery(null))[0].liked_by_me, "anonymous never inherits viewer like state")
  await denied(B, "select * from public.diorama_publication_likes",[], "liker identity not exposed")
  await as(B, "select public.set_diorama_like($1,false)",[pub]); await as(B, "select public.set_diorama_like($1,false)",[pub])
  check(Number((await gallery(null))[0].like_count) === 0, "unlike is idempotent")
  await as(A, "select public.unpublish_diorama($1)",[D])
  check((await gallery(null)).length === 0, "unpublish removes public listing")
  check((await gallery(B,["new",null,0,12,pub])).length === 0, "unpublish blocks direct detail lookup")
  check((await as(B,"select * from public.diorama_publications where id=$1",[pub])).length === 0, "unpublish blocks direct table lookup")
  check((await as(A,"select * from public.diorama_publications where id=$1",[pub])).length === 1, "owner can manage private publication")
  await denied(B,"select public.set_diorama_like($1,true)",[pub],"cannot like a private work")
  await as(A,"select public.publish_diorama($1,'展示A','説明')",[D])
  await denied(A,"select public.report_community_content('diorama',$1,'理由')",[pub],"cannot report own content")
  await as(B,"select public.report_community_content('diorama',$1,'不適切な内容')",[pub])
  await as(B,"select public.report_community_content('diorama',$1,'重複')",[pub])
  check((await db.query("select * from public.community_reports")).rows.length === 1,"duplicate reports are idempotent")
  await denied(B,"select * from public.list_community_reports()",[],"normal user cannot read reports")
  await denied(B,"insert into public.community_moderators values($1)",[B],"user cannot grant themselves moderator")
  let reports = await as(M,"select * from public.list_community_reports()")
  check(reports.length === 1 && reports[0].target_content.title === "展示A", "moderator can inspect reported content")
  const reportId = reports[0].id
  await denied(B,"select public.moderate_community_report($1,'hide','理由')",[reportId],"normal user cannot moderate")
  await as(M,"select public.moderate_community_report($1,'hide','確認済み')",[reportId])
  check((await gallery(null)).length === 0,"hidden work removed from public gallery")
  await denied(A,"select public.publish_diorama($1,'再公開','説明')",[D],"owner cannot bypass moderation by updating")
  await as(A,"select public.unpublish_diorama($1)",[D])
  await as(M,"select public.moderate_community_report($1,'restore','解除')",[reportId])
  check((await gallery(null)).length === 0,"moderator restore respects author's private setting")
  await as(A,"select public.publish_diorama($1,'再公開','説明')",[D])
  check((await gallery(null)).length === 1,"owner can republish after moderation restored")
  check((await gallery(null,["new",B,0,12,null])).length === 0,"author filter does not return other authors")
  check((await gallery(null,["new",A,1,12,null])).length === 0,"pagination offset applied")
  await db.query("insert into public.mural_posts(id,user_id,spot_id,saved_robot_id,author_name,robot_name,robot_config,review) values($1,$2,'muroran-university',$3,'作者A','ロボット','{}','元のレビュー')",[POST,A,R])
  check((await as(B,"update public.mural_posts set review='他人の改変' where id=$1 returning id",[POST])).length === 0,"cannot edit someone else's mural")
  await as(A,"update public.mural_posts set review='編集したレビュー' where id=$1",[POST])
  check((await as(null,"select review from public.mural_posts where id=$1",[POST]))[0].review === "編集したレビュー","owner mural review edits are public")
  await as(B,"select public.report_community_content('mural',$1,'壁画通報')",[POST])
  reports = await as(M,"select * from public.list_community_reports()")
  const muralReport = reports.find((r) => r.target_kind === "mural")
  await as(M,"select public.moderate_community_report($1,'hide','壁画非表示')",[muralReport.id])
  check((await as(null,"select * from public.mural_posts where id=$1",[POST])).length === 0,"hidden mural unavailable on public and mobile table reads")
  check((await as(null,"select * from public.get_mural_like_counts('muroran-university')")).length === 0,"hidden mural excluded from public counts")
  await as(A,"update public.mural_posts set review='編集しても非表示' where id=$1",[POST])
  check((await as(null,"select * from public.mural_posts where id=$1",[POST])).length === 0,"editing cannot lift mural moderation")
  await denied(B,"insert into public.mural_post_likes(post_id,user_id) values($1,$2)",[POST,B],"cannot like hidden mural")
  await denied(B,"select * from public.community_moderation_audit",[],"moderation audit not public")
  check((await db.query("select * from public.community_moderation_audit")).rows.length === 3,"moderation decisions recorded")
  await db.query("update public.saved_robots set config=jsonb_set(config,'{heldItem,customItemId}',to_jsonb($1::text)) where id=$2",[OTHER,R])
  await denied(A,"select public.publish_diorama($1,'不正参照','説明')",[D],"cannot publish another owner's held item")
  check((await gallery(null))[0].title === "再公開","failed publish preserves previous snapshot atomically")
  await db.query("delete from public.dioramas where id=$1",[D])
  check((await gallery(null)).length === 0,"source deletion removes publication")
  reports = await as(M,"select * from public.list_community_reports('resolved')")
  check(reports.find((r) => r.id === reportId)?.target_content === null,"deleted report target handled safely")
  console.log(`Phase 6 database: ${checks} checks PASS`)
} finally { await db.close() }
