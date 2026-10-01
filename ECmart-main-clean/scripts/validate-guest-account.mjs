import fs from "node:fs"

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
const files = {
  guest: read("lib/guest-session.ts"),
  account: read("lib/account-context.tsx"),
  accountView: read("components/views/account-view.tsx"),
  robot: read("components/robot/robot-workshop.tsx"),
  diorama: read("components/diorama/diorama-workshop.tsx"),
  cart: read("components/views/cart-view.tsx"),
  mobile: read("components/mobile/mobile-site.tsx"),
  route: read("app/api/guest-purchase/route.ts"),
}

const checks = []
function check(name, condition) {
  checks.push({ name, ok: Boolean(condition) })
}

check("guest workspace uses sessionStorage", files.guest.includes("window.sessionStorage"))
check("guest workspace does not use localStorage", !files.guest.includes("localStorage"))
check("guest robot has stable temporary UUID", files.guest.includes("existingId") && files.guest.includes("readGuestRobotDraft()?.id"))
check("guest diorama has stable temporary UUID", files.guest.includes("readGuestDioramaDraft()?.id"))
check("guest workspace can be cleared", files.guest.includes("clearGuestWorkspaceStorage"))

check("account context exposes guest robot draft", files.account.includes("guestRobotDraft: GuestRobotDraft | null"))
check("account context exposes guest diorama draft", files.account.includes("guestDioramaDraft: GuestDioramaDraft | null"))
check("account context can import guest workspace", files.account.includes("importGuestWorkspace"))
check("guest robot import preserves guest id", files.account.includes("id: guestRobotDraft.id"))
check("guest diorama import preserves guest id", files.account.includes("id: guestDioramaDraft.id"))
check("guest import writes only after a user exists", files.account.includes('if (!supabase || !user) return { error: "ゲスト作品を保存するにはログインが必要です。" }'))
check("guest workspace is cleared after successful import", files.account.includes("clearGuestWorkspaceStorage()"))

check("robot workshop restores guest draft", files.robot.includes("account.guestRobotDraft"))
check("robot workshop autosaves guest draft", files.robot.includes("account.updateGuestRobotDraft(config)"))
check("robot workshop requires account for permanent save", files.robot.includes("アカウント作成で保存"))

check("diorama uses temporary guest robot", files.diorama.includes("account.guestRobot ? [account.guestRobot] : []"))
check("diorama restores guest draft", files.diorama.includes("account.guestDioramaDraft"))
check("diorama autosaves guest draft", files.diorama.includes("account.updateGuestDioramaDraft(document)"))
check("guest custom item placement stays login-only", files.diorama.includes("自作アイテムの保存・配置はログイン後に利用できます"))

check("desktop cart posts to guest endpoint", files.cart.includes('fetch("/api/guest-purchase"'))
check("guest checkout collects shipping only at confirmation", files.cart.includes("guestShipping"))
check("guest checkout awards zero points", files.route.includes("pointsAwarded: 0") && files.route.includes("pointsBalance: 0"))
check("guest checkout calculates totals on server", files.route.includes("calculateCartTotals(items)"))
check("guest checkout does not import Supabase", !files.route.includes("supabase".replace(/^./, "S")) && !/from\s+["'][^"']*supabase/i.test(files.route))
check("guest checkout does not write an order table", !files.route.includes('.from("orders")') && !files.route.includes("complete_purchase_for_user"))
check("shipping is not returned in success payload", !/const result\s*=\s*\{[\s\S]*?shipping\s*[:,]/m.test(files.route))
check("mobile guest checkout posts to guest endpoint", files.mobile.includes('action="/api/guest-purchase"'))
check("mobile guest checkout explains no address persistence", files.mobile.includes("配送先保存なし"))
check("account page exposes guest workflow", files.accountView.includes("ゲスト利用") && files.accountView.includes("ゲスト作品を引き継ぐ"))

const failed = checks.filter((entry) => !entry.ok)
for (const entry of checks) console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.name}`)
console.log(`\nGuest account checks: ${checks.length - failed.length}/${checks.length} PASS`)
if (failed.length) process.exit(1)
