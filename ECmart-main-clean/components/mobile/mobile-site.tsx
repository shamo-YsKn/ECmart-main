import { formatYen, getProduct, getShop, products, shops, townEvents } from "@/lib/data"
import { getMobileAccountData, readMobileCart } from "@/lib/mobile-server"
import type { RobotBase, RobotConfig, RobotItem, RobotPose, RobotView, ShopCategory } from "@/lib/types"
import { ROBOT_BASE_OPTIONS, ROBOT_ITEM_OPTIONS, ROBOT_POSE_OPTIONS, ROBOT_VIEW_OPTIONS } from "@/lib/robot-parts"
import { RobotFallback } from "@/components/robot/robot-fallback"

const TABS = [
  ["home", "ホーム"],
  ["shops", "ショップ"],
  ["ranking", "ランキング"],
  ["robot", "工房"],
  ["account", "アカウント"],
  ["cart", "カート"],
] as const

const BODY_COLORS = [
  ["アルミ", "#c9a24b"], ["しろがね", "#eceeef"], ["くろがね", "#8d9194"],
  ["レンガ", "#e8842f"], ["しんちゅう", "#c9a24b"], ["あおがね", "#5b8c9c"],
  ["もえぎ", "#7ba05b"], ["うすべに", "#d98aa0"], ["はがね", "#8a8f96"],
] as const
const ACCENT_COLORS = [
  ["黒", "#111111"], ["濃いグレー", "#777777"], ["さくら", "#e86a8f"],
  ["たまご", "#ffcf4d"], ["みずいろ", "#5fb6d1"], ["わかば", "#6fbf73"], ["だいだい", "#f08a3c"],
] as const
const CATEGORIES: Array<ShopCategory | "すべて"> = ["すべて", "食品", "工芸", "花・緑", "喫茶", "雑貨"]

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
  const base = one(params.base) === "natty" ? "natty" : "volta"
  const viewRaw = one(params.view); const poseRaw = one(params.pose); const itemRaw = one(params.item)
  const view: RobotView = viewRaw === "side" || viewRaw === "back" ? viewRaw : "front"
  const pose: RobotPose = poseRaw === "wave" || poseRaw === "stand" || poseRaw === "point" ? poseRaw : "cheer"
  const item: RobotItem = itemRaw === "wrench" || itemRaw === "flower" || itemRaw === "gear" || itemRaw === "heart" ? itemRaw : "none"
  const size = Math.max(20, Math.min(90, Number(one(params.size)) || 55))
  return {
    base,
    view,
    pose,
    item,
    size,
    bodyColor: one(params.bodyColor) || "#c9a24b",
    accentColor: one(params.accentColor) || "#111111",
    name: (one(params.name) || (base === "volta" ? "ボルタ" : "ナッティ")).slice(0, 40),
  }
}
function robotHref(config: RobotConfig, change: Partial<RobotConfig>) {
  const next = { ...config, ...change }
  return q({ tab: "robot", base: next.base, view: next.view, pose: next.pose, item: next.item, size: next.size, bodyColor: next.bodyColor, accentColor: next.accentColor, name: next.name })
}

export async function MobileSite({ params }: { params: Params }) {
  const tab = (one(params.tab) || "home") as typeof TABS[number][0]
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
      content = <div className="flex flex-col gap-5"><div><h1 className="font-display text-3xl font-black">ショップ一覧</h1><p className="text-muted-foreground">町のお店をのぞいてみましょう。</p></div>
        <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <a key={c} className={pill(category === c)} href={q({ tab: "shops", category: c })}>{c}</a>)}</div>
        {filtered.map((shop) => <Card key={shop.id}><div className="flex items-start gap-3"><div className="text-4xl">{shop.emoji}</div><div className="flex-1"><h2 className="font-display text-lg font-bold">{shop.name}</h2><p className="text-sm font-bold text-primary">{shop.tagline}</p><p className="mt-1 text-sm text-muted-foreground">{shop.town}・★{shop.rating}</p></div></div><a className={`${pill()} mt-4 w-full`} href={q({ tab: "shops", category, shop: shop.id })}>お店を見る</a></Card>)}
      </div>
    }
  } else if (tab === "ranking") {
    const kind = one(params.rank) || "monthly"
    const ranked = [...products].sort((a,b) => kind === "all" ? b.soldCount-a.soldCount : b.last30DaysSold-a.last30DaysSold)
    content = <div className="flex flex-col gap-5"><h1 className="font-display text-3xl font-black">ランキング</h1><div className="flex gap-2"><a className={pill(kind === "monthly")} href={q({tab:"ranking",rank:"monthly"})}>月間</a><a className={pill(kind === "all")} href={q({tab:"ranking",rank:"all"})}>累計</a></div>{ranked.slice(0,10).map((p,i)=><div key={p.id} className="flex gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-primary text-white font-black">{i+1}</div><div className="flex-1"><ProductRow productId={p.id} favorites={account.favorites} loggedIn={!!account.user} returnTo={returnTo} quantity={quantityOf(p.id)} /></div></div>)}</div>
  } else if (tab === "robot") {
    const config = parseRobot(params)
    content = <div className="flex flex-col gap-5"><div><h1 className="font-display text-3xl font-black">ロボット工房</h1><p className="text-muted-foreground">スマホ版は2D表示。通常は画面遷移なしで反映し、通信非対応時だけ通常遷移へ切り替わります。</p></div>
      {one(params.robotSaved) && <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">ロボットを保存しました。</div>}
      {one(params.robotError) && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{one(params.robotError)}</div>}
      <Card><div className="mx-auto aspect-square max-w-xs"><RobotFallback config={config} /></div><div className="text-center font-display font-black">{config.name}</div></Card>
      <Card><h2 className="font-display font-bold">タイプ</h2><div className="mt-3 grid grid-cols-2 gap-2">{ROBOT_BASE_OPTIONS.map(o=><a key={o.value} className={pill(config.base===o.value)} href={robotHref(config,{base:o.value,name:config.name==="ボルタ"||config.name==="ナッティ"?(o.value==="volta"?"ボルタ":"ナッティ"):config.name})}>{o.label}</a>)}</div></Card>
      <Card><h2 className="font-display font-bold">向き</h2><div className="mt-3 flex flex-wrap gap-2">{ROBOT_VIEW_OPTIONS.map(o=><a key={o.value} className={pill(config.view===o.value)} href={robotHref(config,{view:o.value})}>{o.label}</a>)}</div></Card>
      <Card><h2 className="font-display font-bold">ポーズ</h2><div className="mt-3 flex flex-wrap gap-2">{ROBOT_POSE_OPTIONS.map(o=><a key={o.value} className={pill(config.pose===o.value)} href={robotHref(config,{pose:o.value})}>{o.label}</a>)}</div></Card>
      <Card><h2 className="font-display font-bold">持ち物</h2><div className="mt-3 flex flex-wrap gap-2">{ROBOT_ITEM_OPTIONS.map(o=><a key={o.value} className={pill(config.item===o.value)} href={robotHref(config,{item:o.value})}>{o.label}</a>)}</div></Card>
      <Card><h2 className="font-display font-bold">ボディ色</h2><div className="mt-3 flex flex-wrap gap-3">{BODY_COLORS.map(([label,color])=><a key={color} title={label} aria-label={label} href={robotHref(config,{bodyColor:color})} className={`size-10 rounded-full border-4 ${config.bodyColor===color?"border-primary":"border-white"}`} style={{backgroundColor:color}} />)}</div><h2 className="mt-5 font-display font-bold">アクセント色</h2><div className="mt-3 flex flex-wrap gap-3">{ACCENT_COLORS.map(([label,color])=><a key={color} title={label} aria-label={label} href={robotHref(config,{accentColor:color})} className={`size-10 rounded-full border-4 ${config.accentColor===color?"border-primary":"border-white"}`} style={{backgroundColor:color}} />)}</div></Card>
      <Card><form method="get" action="/"><input type="hidden" name="tab" value="robot" />{Object.entries(config).filter(([k])=>k!=="name"&&k!=="size").map(([k,v])=><input key={k} type="hidden" name={k} value={String(v)} />)}<label className="font-display font-bold" htmlFor="mobile-robot-name">名前</label><input id="mobile-robot-name" name="name" defaultValue={config.name} maxLength={40} className="mt-2 h-11 w-full rounded-xl border px-3" /><label className="mt-4 block font-display font-bold" htmlFor="mobile-robot-size">大きさ: {config.size}cm</label><input id="mobile-robot-size" type="range" name="size" min="20" max="90" defaultValue={config.size} className="mt-2 w-full" /><button className={`${pill()} mt-4 w-full`} type="submit">名前・大きさを反映</button></form></Card>
      {account.user ? <form action="/api/mobile/robot" method="post"><input type="hidden" name="returnTo" value={returnTo} />{Object.entries(config).map(([k,v])=><input key={k} type="hidden" name={k} value={String(v)} />)}<button type="submit" className={`${pill(true)} w-full`}>このロボットを保存</button></form> : <a className={`${pill()} w-full`} href="/?tab=account">保存するにはログイン</a>}
    </div>
  } else if (tab === "account") {
    const loginError = one(params.loginError)
    if (!account.user) content = <div className="mx-auto flex max-w-lg flex-col gap-5"><h1 className="font-display text-3xl font-black">アカウント</h1><p className="text-muted-foreground">スマホ版は軽量Ajaxでログインします。Reactが使えない場合も通常フォームへ自動フォールバックします。</p>{loginError&&<div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{loginError}</div>}<Card><form method="post" action="/api/mobile/auth/login" className="flex flex-col gap-4"><input type="hidden" name="returnTo" value="/?tab=account"/><label>メールアドレス<input required type="email" name="email" autoComplete="email" className="mt-1 h-11 w-full rounded-xl border px-3"/></label><label>パスワード<input required minLength={6} type="password" name="password" autoComplete="current-password" className="mt-1 h-11 w-full rounded-xl border px-3"/></label><button className={pill(true)} type="submit">ログイン</button></form></Card></div>
    else content = <div className="flex flex-col gap-5"><div><h1 className="font-display text-3xl font-black">マイページ</h1><p className="text-muted-foreground">{account.profile?.display_name || account.user.email || "マチノワ会員"}さん</p></div><form action="/api/mobile/auth/logout" method="post"><input type="hidden" name="returnTo" value="/?tab=account"/><button className={pill()} type="submit">ログアウト</button></form><Card><h2 className="font-display font-bold">お気に入り</h2><p className="mt-1 text-sm text-muted-foreground">{account.favorites.size}件</p><div className="mt-3 flex flex-col gap-2">{[...account.favorites].map(id=>{const p=getProduct(id);return p?<div key={id}>{p.emoji} {p.name}</div>:null})}</div></Card><Card><h2 className="font-display font-bold">保存したロボット</h2><p className="mt-1 text-sm text-muted-foreground">{account.robots.length}体</p><div className="mt-3 flex flex-col gap-3">{account.robots.map(r=><div key={r.id} className="rounded-xl bg-muted p-3"><div className="font-bold">{r.name}</div><div className="text-xs text-muted-foreground">{r.config.base==="volta"?"ボルタ":"ナッティ"}・{r.config.pose}</div></div>)}</div></Card></div>
  } else if (tab === "cart") {
    const details = cartItems.map(item=>({item, product:getProduct(item.productId)})).filter(x=>x.product)
    const total = details.reduce((sum,x)=>sum+(x.product?.price||0)*x.item.quantity,0)
    content = <div className="flex flex-col gap-5"><h1 className="font-display text-3xl font-black">カート</h1>{details.length===0?<Card><p>カゴは空っぽです。</p><a className={`${pill()} mt-3`} href="/?tab=shops">お店をのぞく</a></Card>:<>{details.map(({item,product})=><Card key={item.productId}><div className="flex items-center gap-3"><div className="text-3xl">{product?.emoji}</div><div className="flex-1"><div className="font-bold">{product?.name}</div><div>{formatYen((product?.price||0)*item.quantity)}</div></div></div><form action="/api/mobile/cart" method="post" className="mt-3 flex items-center gap-2"><input type="hidden" name="action" value="set"/><input type="hidden" name="productId" value={item.productId}/><input type="hidden" name="returnTo" value="/?tab=cart"/><input type="number" name="quantity" min="0" max="99" defaultValue={item.quantity} className="h-10 w-20 rounded-xl border px-2"/><button className={pill()} type="submit">変更</button></form></Card>)}<Card><div className="flex justify-between font-display text-xl font-black"><span>商品合計</span><span>{formatYen(total)}</span></div></Card></>}</div>
  } else {
    const featured = products.filter(p=>p.tags.includes("人気")).slice(0,3)
    content = <div className="flex flex-col gap-8"><section className="rounded-3xl border-2 bg-card p-6"><div className="text-sm font-bold text-primary">町とつながる、体験型マーケット</div><h1 className="mt-3 font-display text-4xl font-black">町のあたたかさを、<br/>おうちまで。</h1><p className="mt-3 text-muted-foreground">こだわりのお店と、ロボット工房を楽しめます。</p><div className="mt-5 grid grid-cols-2 gap-2"><a className={pill(true)} href="/?tab=shops">お店をのぞく</a><a className={pill()} href="/?tab=robot">ロボット工房へ</a></div></section><section><h2 className="font-display text-2xl font-black">人気の商品</h2><div className="mt-4 flex flex-col gap-3">{featured.map(p=><ProductRow key={p.id} productId={p.id} favorites={account.favorites} loggedIn={!!account.user} returnTo={returnTo} quantity={quantityOf(p.id)}/>)}</div></section><section><h2 className="font-display text-2xl font-black">町のイベント</h2><div className="mt-4 flex flex-col gap-3">{townEvents.slice(0,3).map(ev=><Card key={ev.id}><div className="font-bold">{ev.date} {ev.title}</div><p className="mt-1 text-sm text-muted-foreground">{ev.description}</p><a className={`${pill()} mt-3`} href={ev.url}>くわしく見る</a></Card>)}</div></section></div>
  }

  return <><div data-mobile-shell className="min-h-svh bg-background text-foreground"><header className="sticky top-0 z-40 border-b bg-background/95"><div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4"><a href="/?tab=home" className="font-display text-xl font-black">🔩 マチノワ</a><div className="text-sm">{account.user ? "ログイン中" : "ゲスト"}</div></div></header><main className="mx-auto max-w-3xl px-4 pb-28 pt-6">{one(params.favoriteError)&&<div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">{one(params.favoriteError)}</div>}{content}</main><nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background"><div className="mx-auto grid max-w-3xl grid-cols-6">{TABS.map(([key,label])=><a key={key} href={q({tab:key})} className={`flex min-h-16 items-center justify-center px-1 text-center text-[0.68rem] font-bold ${tab===key?"text-primary":"text-muted-foreground"}`}>{label}{key==="cart"&&cartCount>0?` (${cartCount})`:""}</a>)}</div></nav></div><script src="/mobile-enhance.js" defer></script></>
}
