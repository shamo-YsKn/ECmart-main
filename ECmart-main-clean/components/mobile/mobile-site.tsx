import { randomUUID } from "node:crypto"
import { formatYen, getProduct, getShop, products, shops, townEvents } from "@/lib/data"
import { getMobileAccountData, getMobileMuralPosts, getMobileOrder, readMobileCart } from "@/lib/mobile-server"
import type { RobotConfig, ShopCategory } from "@/lib/types"
import { ROBOT_BASE_OPTIONS, ROBOT_ITEM_OPTIONS, ROBOT_POSE_OPTIONS, ROBOT_VIEW_OPTIONS } from "@/lib/robot-parts"
import { RobotFallback } from "@/components/robot/robot-fallback"
import { calculateCartTotals } from "@/lib/purchase"
import { GACHA_CATEGORY_LABELS, GACHA_COST, GACHA_RARITY_LABELS, getGachaReward, rewardPreview } from "@/lib/gacha"
import { normalizeRobotConfig } from "@/lib/robot-config"
import { DEFAULT_MURAL_VARIANT_ID, MURAL_WALL_ROBOT_LIMIT, MURORAN_SPOTS, getMuroranSpot, getSpotProducts, muralSpotForVariant, muralVariantsForSpot } from "@/lib/mural-spots"
import { generateAmbientMuralRobots, localMuralDateKey } from "@/lib/mural-npc"
import {
  ROBOT_ACCENT_COLORS,
  ROBOT_BODY_COLORS,
  isRobotColorUnlocked,
  isRobotItemUnlocked,
} from "@/lib/robot-customization"

const TABS = [
  ["home", "ホーム"],
  ["shops", "ショップ"],
  ["mural", "まち歩き"],
  ["ranking", "ランキング"],
  ["robot", "工房"],
  ["account", "アカウント"],
  ["cart", "カート"],
] as const

const CATEGORIES: Array<ShopCategory | "すべて"> = ["すべて", "食品", "工芸"]

type Params = Record<string, string | string[] | undefined>
function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value }
function q(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") search.set(key, String(value)) })
  return `/?${search.toString()}`
}
function pill(active = false) {
  return `inline-flex min-h-9 items-center justify-center rounded-full border px-3 py-2 text-sm font-bold ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border-2 bg-card p-4 ${className}`}>{children}</div>
}

function ProductRow({ productId, favorites, loggedIn, returnTo, quantity }: { productId: string; favorites: Set<string>; loggedIn: boolean; returnTo: string; quantity: number }) {
  const product = getProduct(productId)
  if (!product) return null
  const shop = getShop(product.shopId)
  const fav = favorites.has(product.id)
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-3xl">{product.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">{shop?.emoji} {shop?.name}</div>
          <div className="font-display font-bold">{product.name}</div>
          <div className="font-display font-black text-primary">{formatYen(product.price)}</div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{product.description}</p>
      <div className="grid grid-cols-2 gap-2">
        {loggedIn ? (
          <form action="/api/mobile/favorite" method="post">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className={`${pill(fav)} w-full`} type="submit">{fav ? "♥ お気に入り済み" : "♡ お気に入り"}</button>
          </form>
        ) : <a className={pill(false)} href="/?tab=account">♡ ログインして保存</a>}
        <form action="/api/mobile/cart" method="post">
          <input type="hidden" name="action" value="add" />
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button className={`${pill(false)} w-full`} type="submit">{quantity > 0 ? `カゴに追加 (${quantity})` : "カゴに入れる"}</button>
        </form>
      </div>
    </Card>
  )
}

function parseRobot(params: Params): RobotConfig {
  return normalizeRobotConfig({
    base: one(params.base),
    view: one(params.view),
    pose: one(params.pose),
    item: one(params.item),
    size: one(params.size),
    bodyColor: one(params.bodyColor),
    accentColor: one(params.accentColor),
    name: one(params.name),
  })
}
function robotHref(config: RobotConfig, change: Partial<RobotConfig>) {
  const next = { ...config, ...change }
  return q({ tab: "robot", base: next.base, view: next.view, pose: next.pose, item: next.item, size: next.size, bodyColor: next.bodyColor, accentColor: next.accentColor, name: next.name })
}

type MobilePageTab = typeof TABS[number][0] | "gacha" | "workbench" | "diorama"

export async function MobileSite({ params }: { params: Params }) {
  const tab = (one(params.tab) || "home") as MobilePageTab
  const account = await getMobileAccountData()
  const cartItems = await readMobileCart()
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const returnTo = q(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, one(v)])))
  const quantityOf = (id: string) => cartItems.find((item) => item.productId === id)?.quantity ?? 0

  let content: React.ReactNode
  if (tab === "shops") {
    const category = (one(params.category) || "すべて") as ShopCategory | "すべて"
    const shopId = one(params.shop)
    const selected = shops.find((shop) => shop.id === shopId)
    if (selected) {
      const list = products.filter((p) => p.shopId === selected.id)
      content = <div className="flex flex-col gap-5">
        <a className={pill()} href={q({ tab: "shops", category })}>← ショップ一覧へ</a>
        <Card><div className="text-4xl">{selected.emoji}</div><h1 className="font-display text-2xl font-black">{selected.name}</h1><p className="text-primary font-bold">{selected.tagline}</p><p className="mt-2 text-sm text-muted-foreground">{selected.description}</p></Card>
        {list.map((product) => <ProductRow key={product.id} productId={product.id} favorites={account.favorites} loggedIn={!!account.user} returnTo={returnTo} quantity={quantityOf(product.id)} />)}
      </div>
    } else {
      const filtered = category === "すべて" ? shops : shops.filter((shop) => shop.category === category)
      content = <div className="flex flex-col gap-5"><div><h1 className="font-display text-3xl font-black">ショップ一覧</h1><p className="text-muted-foreground">室蘭のお店と名物をのぞいてみましょう。</p><p className="mt-1 text-xs text-muted-foreground">※デモ表示です。価格・提供内容・発送可否は各店の最新案内をご確認ください。</p></div>
        <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <a key={c} className={pill(category === c)} href={q({ tab: "shops", category: c })}>{c}</a>)}</div>
        {filtered.map((shop) => <Card key={shop.id}><div className="flex items-start gap-3"><div className="text-4xl">{shop.emoji}</div><div className="flex-1"><h2 className="font-display text-lg font-bold">{shop.name}</h2><p className="text-sm font-bold text-primary">{shop.tagline}</p><p className="mt-1 text-sm text-muted-foreground">{shop.town}</p></div></div><a className={`${pill()} mt-4 w-full`} href={q({ tab: "shops", category, shop: shop.id })}>お店を見る</a></Card>)}
      </div>
    }
  } else if (tab === "mural") {
    const spot = getMuroranSpot(one(params.spot)) ?? MURORAN_SPOTS[0]
    const muralVariants = muralVariantsForSpot(spot)
    const requestedVariant = one(params.muralStage) || DEFAULT_MURAL_VARIANT_ID
    const activeVariant = muralVariants.find((variant) => variant.id === requestedVariant) ?? muralVariants[0]
    const activeMuralSpot = muralSpotForVariant(spot, activeVariant.id)
    const muralPosts = await getMobileMuralPosts(spot.id, activeVariant.id)
    const mobileWallPosts = muralPosts.slice(0, MURAL_WALL_ROBOT_LIMIT)
    const ambientRobots = generateAmbientMuralRobots(
      activeMuralSpot,
      mobileWallPosts.length,
      mobileWallPosts.map((post) => ({ x: post.positionX, y: post.positionY })),
      `${localMuralDateKey()}|${activeVariant.id}`,
    )
    const spotProducts = getSpotProducts(spot)
    content = <div className="flex flex-col gap-5">
      <div><div className="text-sm font-bold text-primary">Phase 5 / まち歩き</div><h1 className="font-display text-3xl font-black">室蘭マップと壁画</h1><p className="mt-2 text-muted-foreground">スポットごとの壁画とレビューをスマホでも閲覧できます。投稿位置の編集はPC版が中心です。</p></div>
      <Card><div className="grid grid-cols-2 gap-2">{MURORAN_SPOTS.map((entry)=><a key={entry.id} href={q({tab:"mural",spot:entry.id})} className={`${pill(entry.id===spot.id)} justify-start`}><span className="mr-1">{entry.emoji}</span>{entry.shortName}</a>)}</div></Card>
      {muralVariants.length>1&&<Card><div className="text-sm font-bold">室工大の壁画ステージ</div><div className="mt-3 flex flex-wrap gap-2">{muralVariants.map(variant=><a key={variant.id} className={pill(activeVariant.id===variant.id)} href={q({tab:"mural",spot:spot.id,muralStage:variant.id===DEFAULT_MURAL_VARIANT_ID?undefined:variant.id})}>{variant.label}</a>)}</div></Card>}
      <Card><div className="text-4xl">{spot.emoji}</div><h2 className="font-display mt-2 text-2xl font-black">{spot.name}</h2><div className="mt-1 text-sm font-bold text-primary">{activeMuralSpot.muralTitle}</div><p className="mt-2 text-sm text-muted-foreground">{activeMuralSpot.description}</p><div className="mt-3 flex gap-2 text-xs"><span className="rounded-full bg-muted px-2 py-1">ユーザー投稿 {muralPosts.length}</span><span className="rounded-full bg-muted px-2 py-1">街のロボット {ambientRobots.length}</span></div></Card>
      <Card><h2 className="font-display font-bold">この場所の壁画</h2><p className="mt-1 text-xs text-muted-foreground">「街のロボット」は自動生成で、実ユーザーのレビューではありません。</p><div className="mt-4 grid grid-cols-2 gap-3">{ambientRobots.slice(0, MURAL_WALL_ROBOT_LIMIT).map((robot)=><div key={robot.id} className="rounded-xl bg-muted p-2"><div className="aspect-square"><RobotFallback config={robot.config}/></div><div className="text-center text-xs font-bold">{robot.label}</div><div className="text-center text-[10px] text-muted-foreground">自動生成</div></div>)}{mobileWallPosts.map((post)=><details key={post.id} className="rounded-xl border bg-background p-2"><summary className="cursor-pointer list-none"><div className="aspect-square"><RobotFallback config={{...post.robotConfig,view:post.robotView}} customItemDocument={post.customItemDocument}/></div><div className="text-center text-xs font-bold">{post.authorName}さん</div><div className="text-center text-[10px] text-primary">レビューあり</div></summary><p className="mt-2 rounded-lg bg-muted p-2 text-xs leading-relaxed">「{post.review}」</p></details>)}</div></Card>
      {spotProducts.length>0&&<div className="flex flex-col gap-3"><h2 className="font-display text-xl font-black">この場所の商品</h2>{spotProducts.slice(0,3).map(product=><ProductRow key={product.id} productId={product.id} favorites={account.favorites} loggedIn={!!account.user} returnTo={returnTo} quantity={quantityOf(product.id)}/>)}</div>}
      <Card><p className="text-sm text-muted-foreground">壁画への投稿、位置調整、いいね、作者プロフィールはPC版の「まち歩き」で利用できます。</p></Card>
    </div>
  } else if (tab === "ranking") {
    const kind = one(params.rank) || "monthly"
    const ranked = [...products].sort((a,b) => kind === "all" ? b.soldCount-a.soldCount : b.last30DaysSold-a.last30DaysSold)
    content = <div className="flex flex-col gap-5"><h1 className="font-display text-3xl font-black">ランキング</h1><div className="flex gap-2"><a className={pill(kind === "monthly")} href={q({tab:"ranking",rank:"monthly"})}>月間</a><a className={pill(kind === "all")} href={q({tab:"ranking",rank:"all"})}>累計</a></div>{ranked.slice(0,10).map((p,i)=><div key={p.id} className="flex gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-primary text-white font-black">{i+1}</div><div className="flex-1"><ProductRow productId={p.id} favorites={account.favorites} loggedIn={!!account.user} returnTo={returnTo} quantity={quantityOf(p.id)} /></div></div>)}</div>
  } else if (tab === "robot") {
    const config = parseRobot(params)
    const unlockedRewardIds = new Set(account.gachaInventory.map((entry) => entry.rewardId))
    const availableBodyColors = ROBOT_BODY_COLORS.filter((color) =>
      isRobotColorUnlocked(color, unlockedRewardIds, config.bodyColor),
    )
    const availableAccentColors = ROBOT_ACCENT_COLORS.filter((color) =>
      isRobotColorUnlocked(color, unlockedRewardIds, config.accentColor),
    )
    const availableItems = ROBOT_ITEM_OPTIONS.filter((option) =>
      isRobotItemUnlocked(option.value, unlockedRewardIds, config.item),
    )
    content = <div className="flex flex-col gap-5"><div><h1 className="font-display text-3xl font-black">ロボット工房</h1><p className="text-muted-foreground">スマホ版は2D表示。通常は画面遷移なしで反映し、通信非対応時だけ通常遷移へ切り替わります。</p></div>
      {one(params.robotSaved) && <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">ロボットを保存しました。</div>}
      {one(params.robotError) && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{one(params.robotError)}</div>}
      <Card><div className="mx-auto aspect-square max-w-xs"><RobotFallback config={config} /></div><div className="text-center font-display font-black">{config.name}</div></Card>
      <Card><h2 className="font-display font-bold">タイプ</h2><div className="mt-3 grid grid-cols-2 gap-2">{ROBOT_BASE_OPTIONS.map(o=><a key={o.value} className={pill(config.base===o.value)} href={robotHref(config,{base:o.value,name:config.name==="ボルタ"||config.name==="ナッティ"?(o.value==="volta"?"ボルタ":"ナッティ"):config.name})}>{o.label}</a>)}</div></Card>
      <Card><h2 className="font-display font-bold">向き</h2><div className="mt-3 flex flex-wrap gap-2">{ROBOT_VIEW_OPTIONS.map(o=><a key={o.value} className={pill(config.view===o.value)} href={robotHref(config,{view:o.value})}>{o.label}</a>)}</div></Card>
      <Card><h2 className="font-display font-bold">ポーズ</h2><div className="mt-3 flex flex-wrap gap-2">{ROBOT_POSE_OPTIONS.map(o=><a key={o.value} className={pill(config.pose===o.value)} href={robotHref(config,{pose:o.value})}>{o.label}</a>)}</div></Card>
      <Card><h2 className="font-display font-bold">持ち物</h2><div className="mt-3 flex flex-wrap gap-2">{availableItems.map(o=><a key={o.value} className={pill(config.item===o.value)} href={robotHref(config,{item:o.value})}>{o.label}</a>)}</div></Card>
      <Card><h2 className="font-display font-bold">ボディ色</h2><div className="mt-3 flex flex-wrap gap-3">{availableBodyColors.map((color)=><a key={color.value} title={color.label} aria-label={color.label} href={robotHref(config,{bodyColor:color.value})} className={`size-10 rounded-full border-4 ${config.bodyColor===color.value?"border-primary":"border-white"}`} style={{backgroundColor:color.value}} />)}</div><h2 className="mt-5 font-display font-bold">目の色</h2><div className="mt-3 flex flex-wrap gap-3">{availableAccentColors.map((color)=><a key={color.value} title={color.label} aria-label={color.label} href={robotHref(config,{accentColor:color.value})} className={`size-10 rounded-full border-4 ${config.accentColor===color.value?"border-primary":"border-white"}`} style={{backgroundColor:color.value}} />)}</div></Card>
      <Card className="border-amber-300 bg-amber-50"><h2 className="font-display font-black">🎁 ボルタ・ナッティ ガチャ</h2><p className="mt-1 text-sm text-muted-foreground">1回{GACHA_COST}pt。カラー・持ちもの・特殊工作素材・室蘭ジオラマ背景が当たります。</p><div className="mt-2 font-bold text-amber-900">保有 {(account.profile?.points ?? 0).toLocaleString()} pt</div><a className={`${pill(true)} mt-4 w-full`} href={account.user?"/?tab=gacha":"/?tab=account"}>{account.user?"ガチャへ":"ログインしてガチャ"}</a></Card>
      <Card><form method="get" action="/"><input type="hidden" name="tab" value="robot" />{Object.entries(config).filter(([k])=>k!=="name"&&k!=="size").map(([k,v])=><input key={k} type="hidden" name={k} value={String(v)} />)}<label className="font-display font-bold" htmlFor="mobile-robot-name">名前</label><input id="mobile-robot-name" name="name" defaultValue={config.name} maxLength={40} className="mt-2 h-11 w-full rounded-xl border px-3" /><label className="mt-4 block font-display font-bold" htmlFor="mobile-robot-size">大きさ: {config.size}cm</label><input id="mobile-robot-size" type="range" name="size" min="20" max="90" defaultValue={config.size} className="mt-2 w-full" /><button className={`${pill()} mt-4 w-full`} type="submit">名前・大きさを反映</button></form></Card>
      {account.user ? <form action="/api/mobile/robot" method="post"><input type="hidden" name="returnTo" value={returnTo} />{Object.entries(config).map(([k,v])=><input key={k} type="hidden" name={k} value={String(v)} />)}<button type="submit" className={`${pill(true)} w-full`}>このロボットを保存</button></form> : <a className={`${pill()} w-full`} href="/?tab=account">保存するにはログイン</a>}
    </div>
  } else if (tab === "gacha") {
    const stage = one(params.stage) || "intro"
    const gachaError = one(params.gachaError)
    const reward = getGachaReward(one(params.reward) || "")
    const pointsBalance = Math.max(0, Number(one(params.balance)) || (account.profile?.points ?? 0))
    const duplicate = one(params.duplicate) === "1"
    const quantity = Math.max(1, Number(one(params.quantity)) || 1)

    if (!account.user) {
      content = <div className="flex flex-col gap-5 text-center"><h1 className="font-display text-3xl font-black">ボルタ・ナッティ ガチャ</h1><Card><div className="text-6xl">🔒</div><h2 className="mt-3 font-display text-xl font-black">ログインが必要です</h2><p className="mt-2 text-sm text-muted-foreground">ポイントと獲得物はアカウントに保存されます。</p><a className={`${pill(true)} mt-4 w-full`} href="/?tab=account">ログインする</a></Card><a className={pill()} href="/?tab=robot">工房へ戻る</a></div>
    } else if (stage === "ready") {
      content = <div className="flex flex-col gap-5 text-center"><h1 className="font-display text-3xl font-black">箱を開けよう！</h1><div className="font-bold text-primary">保有 {(account.profile?.points ?? 0).toLocaleString()} pt</div>{gachaError&&<div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{gachaError}</div>}<Card className="py-10"><form action="/api/gacha" method="post"><input type="hidden" name="rollId" value={one(params.rollId) || randomUUID()}/><button type="submit" className="mx-auto flex size-48 animate-pulse flex-col items-center justify-center rounded-[2rem] border-4 border-primary bg-background text-primary shadow-xl"><span className="text-8xl">🎁</span><span className="mt-2 font-black">タップして開ける</span></button></form><p className="mt-5 text-sm text-muted-foreground">タップすると{GACHA_COST}ptを消費して抽選します。</p></Card><a className={pill()} href="/?tab=gacha">戻る</a></div>
    } else if (stage === "result" && reward) {
      const preview = rewardPreview(reward)
      content = <div className="flex flex-col gap-5 text-center"><div className="text-6xl">✨</div><div><div className="font-bold text-primary">{GACHA_RARITY_LABELS[reward.rarity]}</div><h1 className="font-display text-3xl font-black">{duplicate?"また会えた！":"新しい景品を獲得！"}</h1></div><Card className="flex flex-col items-center gap-4 py-8"><div className="flex size-40 items-center justify-center rounded-[2rem] border bg-muted">{preview.kind==="color"?<span className="size-24 rounded-full border-4 border-white shadow" style={{backgroundColor:preview.color}}/>:<span className="text-7xl">{preview.icon}</span>}</div><div><div className="text-sm text-muted-foreground">{GACHA_CATEGORY_LABELS[reward.category]}</div><div className="font-display text-2xl font-black">{reward.label}</div><div className="mt-1 text-sm text-muted-foreground">所持数：{quantity}個{duplicate?"（重複）":""}</div></div><div className="rounded-xl bg-primary/10 px-5 py-3 font-bold text-primary">残り {pointsBalance.toLocaleString()} pt</div></Card><div className="grid grid-cols-2 gap-2"><a className={pill()} href="/?tab=gacha">もう一度</a><a className={pill(true)} href={reward.category==="workbench_part"?"/?tab=workbench":reward.category==="diorama_stage"?"/?tab=account":"/?tab=robot"}>{reward.category==="workbench_part"?"工作台で使う":reward.category==="diorama_stage"?"マイページで確認":"工房で使う"}</a></div></div>
    } else {
      content = <div className="flex flex-col gap-5 text-center"><div><h1 className="font-display text-3xl font-black">ボルタ・ナッティ ガチャ</h1><p className="mt-2 text-muted-foreground">カラー、持ちもの、特殊工作素材、室蘭ジオラマ背景を獲得できます。</p></div><div className="font-display text-xl font-black text-primary">保有 {(account.profile?.points ?? 0).toLocaleString()} pt</div>{gachaError&&<div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{gachaError}</div>}<Card className="py-10"><div className="text-8xl">🎁</div><h2 className="mt-4 font-display text-2xl font-black">1回 {GACHA_COST}pt</h2><p className="mt-2 text-sm text-muted-foreground">重複した景品は所持数として加算されます。</p><a className={`${pill(true)} mt-5 w-full`} href={q({tab:"gacha",stage:"ready",rollId:randomUUID()})}>1回まわす</a></Card><a className={pill()} href="/?tab=robot">工房へ戻る</a></div>
    }
  } else if (tab === "account") {
    const loginError = one(params.loginError)
    if (!account.user) content = <div className="mx-auto flex max-w-lg flex-col gap-5"><h1 className="font-display text-3xl font-black">アカウント</h1><p className="text-muted-foreground">スマホ版は軽量Ajaxでログインします。Reactが使えない場合も通常フォームへ自動フォールバックします。</p>{loginError&&<div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{loginError}</div>}<Card><form method="post" action="/api/mobile/auth/login" className="flex flex-col gap-4"><input type="hidden" name="returnTo" value="/?tab=account"/><label>メールアドレス<input required type="email" name="email" autoComplete="email" className="mt-1 h-11 w-full rounded-xl border px-3"/></label><label>パスワード<input required minLength={6} type="password" name="password" autoComplete="current-password" className="mt-1 h-11 w-full rounded-xl border px-3"/></label><button className={pill(true)} type="submit">ログイン</button></form></Card></div>
    else content = <div className="flex flex-col gap-5"><div><h1 className="font-display text-3xl font-black">マイページ</h1><p className="text-muted-foreground">{account.profile?.display_name || account.user.email || "マチノワ室蘭会員"}さん</p></div><form action="/api/mobile/auth/logout" method="post"><input type="hidden" name="returnTo" value="/?tab=account"/><button className={pill()} type="submit">ログアウト</button></form><Card className="bg-primary/5"><div className="text-sm text-muted-foreground">保有ポイント</div><div className="mt-1 font-display text-3xl font-black text-primary">{(account.profile?.points ?? 0).toLocaleString()} pt</div><p className="mt-2 text-xs text-muted-foreground">購入100円ごとに200pt・ガチャ1回100pt付与されます。</p></Card><Card><h2 className="font-display font-bold">お気に入り</h2><p className="mt-1 text-sm text-muted-foreground">{account.favorites.size}件</p><div className="mt-3 flex flex-col gap-2">{[...account.favorites].map(id=>{const p=getProduct(id);return p?<div key={id}>{p.emoji} {p.name}</div>:null})}</div></Card><Card><div className="flex items-center justify-between gap-2"><h2 className="font-display font-bold">ガチャで獲得したもの</h2><a className={pill()} href="/?tab=gacha">ガチャへ</a></div><p className="mt-1 text-sm text-muted-foreground">{account.gachaInventory.length}種類</p><div className="mt-3 grid grid-cols-2 gap-2">{account.gachaInventory.map(entry=>{const reward=getGachaReward(entry.rewardId);if(!reward)return null;const preview=rewardPreview(reward);return <div key={entry.rewardId} className="rounded-xl bg-muted p-3"><div className="flex items-center gap-2">{preview.kind==="color"?<span className="size-8 rounded-full border-2 border-white shadow" style={{backgroundColor:preview.color}}/>:<span className="text-2xl">{preview.icon}</span>}<div className="min-w-0"><div className="truncate text-sm font-bold">{reward.label}</div><div className="text-[11px] text-muted-foreground">{GACHA_CATEGORY_LABELS[reward.category]}</div><div className="text-xs text-muted-foreground">×{entry.quantity}</div></div></div></div>})}</div></Card><Card><h2 className="font-display font-bold">保存したロボット</h2><p className="mt-1 text-sm text-muted-foreground">{account.robots.length}体</p><div className="mt-3 flex flex-col gap-3">{account.robots.map(r=><div key={r.id} className="rounded-xl bg-muted p-3"><div className="font-bold">{r.name}</div><div className="text-xs text-muted-foreground">{r.config.base==="volta"?"ボルタ":"ナッティ"}・{r.config.pose}</div></div>)}</div></Card></div>
  } else if (tab === "workbench") {
    content = <div className="flex flex-col gap-5"><div><div className="text-sm font-bold text-primary">Phase 3</div><h1 className="font-display text-3xl font-black">2Dアイテム工作</h1></div><Card><p className="font-bold">このPhaseの自由配置エディタはPC版で利用できます。</p><p className="mt-2 text-sm text-muted-foreground">スマホ互換モードでは自由ドラッグ工作はPC版をご利用ください。ガチャで獲得した特殊素材はアカウントに保存され、PCの工作台で使用できます。</p><a className={`${pill()} mt-4`} href="/?tab=robot">ロボット工房へ戻る</a></Card></div>
  } else if (tab === "diorama") {
    content = <div className="flex flex-col gap-5"><div><div className="text-sm font-bold text-primary">Phase 4</div><h1 className="font-display text-3xl font-black">マイジオラマ</h1></div><Card><p className="font-bold">自由配置ジオラマエディタは現在PC版で利用できます。</p><p className="mt-2 text-sm text-muted-foreground">獲得した背景や保存作品はアカウントに保持されます。PCから同じアカウントでログインすると編集できます。</p><a className={`${pill()} mt-4`} href="/?tab=account">マイページへ戻る</a></Card></div>
  } else if (tab === "cart") {
    const purchaseState = one(params.purchase)
    const purchaseError = one(params.purchaseError)
    const orderId = one(params.order) || ""
    const completedOrder = purchaseState === "complete" && orderId ? await getMobileOrder(orderId) : null
    const totals = calculateCartTotals(cartItems)
    const details = totals.validItems

    if (purchaseState === "complete") {
      content = completedOrder ? <div className="mx-auto flex max-w-lg flex-col gap-5 text-center"><div className="text-6xl">🎉</div><div><h1 className="font-display text-3xl font-black">購入が完了しました！</h1><p className="mt-2 text-muted-foreground">室蘭のお店から、心をこめてお届けします。</p></div><Card className="text-left"><div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">注文番号</span><span className="font-mono font-bold">{completedOrder.orderId.slice(0,8).toUpperCase()}</span></div><div className="mt-3 flex justify-between gap-3"><span>お支払い金額</span><span className="font-display font-black">{formatYen(completedOrder.totalAmount)}</span></div><div className="mt-4 rounded-xl bg-primary/10 p-4 text-center"><div className="font-bold text-primary">獲得ポイント</div><div className="font-display text-3xl font-black text-primary">+{completedOrder.pointsAwarded.toLocaleString()} pt</div><div className="mt-1 text-xs text-muted-foreground">現在の保有ポイント：{(account.profile?.points ?? 0).toLocaleString()} pt</div></div></Card><div className="grid grid-cols-2 gap-2"><a className={pill()} href="/?tab=account">ポイントを見る</a><a className={pill(true)} href="/?tab=home">ホームへ</a></div></div> : <Card><h1 className="font-display text-2xl font-black">購入は完了しています</h1><p className="mt-2 text-muted-foreground">注文情報の取得に時間がかかっています。アカウント画面でポイントをご確認ください。</p><a className={`${pill(true)} mt-4`} href="/?tab=account">アカウントへ</a></Card>
    } else if (one(params.checkout) === "confirm") {
      content = details.length === 0 ? <Card><p>カゴは空っぽです。</p><a className={`${pill()} mt-3`} href="/?tab=shops">お店をのぞく</a></Card> : !account.user ? <div className="flex flex-col gap-4"><h1 className="font-display text-3xl font-black">購入確認</h1><Card><p>購入とポイント付与にはログインが必要です。</p><a className={`${pill(true)} mt-4 w-full`} href="/?tab=account">ログインする</a></Card></div> : <div className="flex flex-col gap-5"><h1 className="font-display text-3xl font-black">注文内容の確認</h1>{details.map(({product,quantity})=><Card key={product.id} className="flex items-center gap-3"><div className="text-3xl">{product.emoji}</div><div className="min-w-0 flex-1"><div className="font-bold">{product.name}</div><div className="text-sm text-muted-foreground">{quantity}点</div></div><div className="font-bold">{formatYen(product.price*quantity)}</div></Card>)}<Card><div className="flex justify-between text-sm"><span>商品合計</span><span>{formatYen(totals.productTotal)}</span></div><div className="mt-2 flex justify-between text-sm"><span>送料</span><span>{formatYen(totals.shippingTotal)}</span></div><div className="mt-3 flex justify-between font-display text-xl font-black"><span>合計</span><span className="text-primary">{formatYen(totals.totalAmount)}</span></div><div className="mt-4 rounded-xl bg-primary/10 p-3 text-center font-bold text-primary">獲得予定 +{totals.pointsAwarded.toLocaleString()} pt</div></Card>{purchaseError&&<div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{purchaseError}</div>}<form action="/api/purchase" method="post"><input type="hidden" name="idempotencyKey" value={one(params.checkoutId) || randomUUID()}/><button className={`${pill(true)} w-full`} type="submit">購入を確定する</button></form><a className={`${pill()} w-full`} href="/?tab=cart">カートへ戻る</a></div>
    } else {
      content = <div className="flex flex-col gap-5"><h1 className="font-display text-3xl font-black">カート</h1>{purchaseError&&<div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{purchaseError}</div>}{details.length===0?<Card><p>カゴは空っぽです。</p><a className={`${pill()} mt-3`} href="/?tab=shops">お店をのぞく</a></Card>:<>{details.map(({product,quantity})=><Card key={product.id}><div className="flex items-center gap-3"><div className="text-3xl">{product.emoji}</div><div className="flex-1"><div className="font-bold">{product.name}</div><div>{formatYen(product.price*quantity)}</div></div></div><form action="/api/mobile/cart" method="post" className="mt-3 flex items-center gap-2"><input type="hidden" name="action" value="set"/><input type="hidden" name="productId" value={product.id}/><input type="hidden" name="returnTo" value="/?tab=cart"/><input type="number" name="quantity" min="0" max="99" defaultValue={quantity} className="h-10 w-20 rounded-xl border px-2"/><button className={pill()} type="submit">変更</button></form></Card>)}<Card><div className="flex justify-between text-sm"><span>商品合計</span><span>{formatYen(totals.productTotal)}</span></div><div className="mt-2 flex justify-between text-sm"><span>送料（{totals.shopCount}店舗）</span><span>{formatYen(totals.shippingTotal)}</span></div><div className="mt-3 flex justify-between font-display text-xl font-black"><span>合計</span><span className="text-primary">{formatYen(totals.totalAmount)}</span></div><div className="mt-4 rounded-xl bg-primary/10 p-3 text-center font-bold text-primary">購入で +{totals.pointsAwarded.toLocaleString()} pt</div><a className={`${pill(true)} mt-4 w-full`} href={account.user?q({tab:"cart",checkout:"confirm",checkoutId:randomUUID()}):"/?tab=account"}>{account.user?"購入する":"ログインして購入"}</a></Card></>}</div>
    }
  } else {
    const featured = products.filter(p=>p.tags.includes("人気")).slice(0,3)
    content = <div className="flex flex-col gap-8"><section className="rounded-3xl border-2 bg-card p-6"><div className="text-sm font-bold text-primary">北の大地・室蘭のセレクトマーケット</div><h1 className="mt-3 font-display text-4xl font-black">鉄のまちの、おいしさと<br/>手仕事を。</h1><p className="mt-3 text-muted-foreground">室蘭やきとり、うずらプリン、カレーラーメンとロボット工房を楽しめます。</p><div className="mt-5 grid grid-cols-2 gap-2"><a className={pill(true)} href="/?tab=shops">お店をのぞく</a><a className={pill()} href="/?tab=robot">ロボット工房へ</a></div></section><section><h2 className="font-display text-2xl font-black">人気の商品</h2><div className="mt-4 flex flex-col gap-3">{featured.map(p=><ProductRow key={p.id} productId={p.id} favorites={account.favorites} loggedIn={!!account.user} returnTo={returnTo} quantity={quantityOf(p.id)}/>)}</div></section><section><h2 className="font-display text-2xl font-black">室蘭の見どころ</h2><div className="mt-4 flex flex-col gap-3">{townEvents.slice(0,3).map(ev=><Card key={ev.id}><div className="font-bold">{ev.title}</div><p className="mt-1 text-sm text-muted-foreground">{ev.description}</p><a className={`${pill()} mt-3`} href={ev.url}>くわしく見る</a></Card>)}</div></section></div>
  }

  return <><div data-mobile-shell className="min-h-svh bg-background text-foreground"><header className="sticky top-0 z-40 border-b bg-background/95"><div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4"><a href="/?tab=home" className="font-display text-xl font-black">🔩 マチノワ室蘭</a><div className="text-sm">{account.user ? "ログイン中" : "ゲスト"}</div></div></header><main className="mx-auto max-w-3xl px-4 pb-28 pt-6">{one(params.favoriteError)&&<div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">{one(params.favoriteError)}</div>}{content}</main><nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background"><div className="mx-auto grid max-w-3xl grid-cols-7">{TABS.map(([key,label])=><a key={key} href={q({tab:key})} className={`flex min-h-16 items-center justify-center px-1 text-center text-[0.68rem] font-bold ${tab===key?"text-primary":"text-muted-foreground"}`}>{label}{key==="cart"&&cartCount>0?` (${cartCount})`:""}</a>)}</div></nav></div><script src="/mobile-enhance.js" defer></script></>
}
