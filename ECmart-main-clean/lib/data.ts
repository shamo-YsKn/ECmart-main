import type { Shop, Product, TownEvent } from "./types"

/**
 * 室蘭の実在店・名物を題材にしたデモ用カタログです。
 * 商品価格や提供内容は変更される場合があるため、実際の購入・来店時は各店の公式案内をご確認ください。
 * soldCount / last30DaysSold はランキング表示用のサンプル値です。
 */
export const shops: Shop[] = [
  {
    id: "shop-kuromu",
    name: "黒夢（クロム）",
    owner: "黒夢",
    category: "食品",
    town: "高砂町",
    tagline: "丼と定食をがっつり楽しむ、室蘭の食堂",
    description:
      "高砂町にある食堂。からあげ定食をはじめ、ローストビーフ丼やレアチャーシュー丼など、食べ応えのあるごはんメニューを楽しめます。",
    emoji: "🍗",
    color: "#34343b",
    rating: 0,
    established: "2026年",
  },
  {
    id: "shop-tetsu",
    name: "てつ工房ボルタ",
    owner: "鉄川 剛",
    category: "工芸",
    town: "こうば通り",
    tagline: "ねじとボルトのちいさな鉄の仲間たち",
    description:
      "廃材のボルトやナットに命を吹き込む金属アート工房。ひとつひとつ手作業で表情をつけた、愛らしい鉄のキャラクターたちが人気です。",
    emoji: "🔩",
    color: "#8a8a8a",
    rating: 4.9,
    established: "2015年",
  },
  {
    id: "shop-uzura",
    name: "室蘭うずら園",
    owner: "株式会社 室蘭うずら園",
    category: "食品",
    town: "石川町",
    tagline: "室蘭生まれのうずら卵を、ふわとろスイーツに",
    description:
      "うずらの孵化・育成から生産、加工、販売までを一貫して行う室蘭の農場。臭みの少ないうずら卵を使ったプリンやカステラが人気です。",
    emoji: "🥚",
    color: "#e4b33f",
    rating: 0,
    established: "1961年",
  },
  {
    id: "shop-ippei",
    name: "やきとりの一平 本店",
    owner: "有限会社 一平本店",
    category: "食品",
    town: "中島町",
    tagline: "1950年創業、室蘭やきとりの伝統を全国へ",
    description:
      "北海道産の豚肩ロースと玉ねぎを串に刺し、秘伝のタレで焼き上げる室蘭やきとりの老舗。タレと洋がらし付きのセットを家庭でも楽しめます。",
    emoji: "🍢",
    color: "#a64935",
    rating: 0,
    established: "1950年",
  },
  {
    id: "shop-isehiro",
    name: "室蘭やきとり 伊勢広",
    owner: "室蘭やきとり 伊勢広",
    category: "食品",
    town: "中島町",
    tagline: "あっさりした継ぎ足しダレと、やわらかな豚肩ロース",
    description:
      "道産豚肩ロースを使った室蘭やきとりと、室蘭産昆布のだしを生かしたおでんが人気。落ち着いた店内と、スタッフとの会話も魅力のお店です。",
    emoji: "🔥",
    color: "#6f4435",
    rating: 0,
    established: "1994年",
  },
  {
    id: "shop-daio",
    name: "味の大王 室蘭本店",
    owner: "味の大王 室蘭本店",
    category: "食品",
    town: "中央町",
    tagline: "濃厚なカレースープと自家製ちぢれ麺、室蘭の一杯",
    description:
      "室蘭カレーラーメンを代表する老舗。熟成させた自家製ちぢれ麺に、コクと辛さのバランスを大切にしたカレースープがよく絡みます。",
    emoji: "🍜",
    color: "#d48b19",
    rating: 0,
    established: "1971年",
  },
]

export const products: Product[] = [
  // 黒夢
  {
    id: "p-kuromu-karaage",
    shopId: "shop-kuromu",
    name: "黒夢のから揚げ定食",
    price: 1300,
    description: "大ぶりのからあげを、ごはんと一緒にしっかり楽しめる黒夢の店頭定食。",
    emoji: "🍗",
    tags: ["人気", "店頭限定"],
    soldCount: 720,
    last30DaysSold: 96,
  },
  {
    id: "p-kuromu-roastbeef",
    shopId: "shop-kuromu",
    name: "ローストビーフ丼",
    price: 1300,
    description: "肉のうまみを味わえる、黒夢おすすめのボリューム系どんぶり。",
    emoji: "🥩",
    tags: ["おすすめ", "店頭限定"],
    soldCount: 510,
    last30DaysSold: 68,
  },
  {
    id: "p-kuromu-rare-chashu",
    shopId: "shop-kuromu",
    name: "レアチャーシュー丼",
    price: 1100,
    description: "しっとりしたレアチャーシューを盛り付けた、満足感のある店頭メニュー。",
    emoji: "🍚",
    tags: ["肉料理", "店頭限定"],
    soldCount: 430,
    last30DaysSold: 54,
  },

  // てつ工房ボルタ（既存内容を維持）
  {
    id: "p-volta",
    shopId: "shop-tetsu",
    name: "ボルタくん（六角ボルトの妖精）",
    price: 2800,
    description: "六角ボルトの頭がチャームポイント。机の上でそっと応援してくれます。",
    emoji: "🔩",
    tags: ["一点物", "手作り"],
    soldCount: 320,
    last30DaysSold: 38,
  },
  {
    id: "p-natty",
    shopId: "shop-tetsu",
    name: "ナッティちゃん（ナットの相棒）",
    price: 2600,
    description: "皿ねじとナットで作った、まるいフォルムの愛らしい仲間。",
    emoji: "⚙️",
    tags: ["一点物", "手作り"],
    soldCount: 410,
    last30DaysSold: 51,
  },
  {
    id: "p-keyring",
    shopId: "shop-tetsu",
    name: "鉄のミニチャーム キーリング",
    price: 1200,
    description: "カバンにつけられる小さな鉄の仲間。毎日をちょっと楽しく。",
    emoji: "🗝️",
    tags: ["ギフト"],
    soldCount: 780,
    last30DaysSold: 96,
  },

  // 室蘭うずら園
  {
    id: "p-uzura-pudding",
    shopId: "shop-uzura",
    name: "室蘭うずらのプリン",
    price: 590,
    description: "室蘭産うずら卵と生乳を使った、二層仕立てのふわとろプリン。",
    emoji: "🍮",
    tags: ["人気", "要冷蔵"],
    soldCount: 1580,
    last30DaysSold: 190,
  },
  {
    id: "p-uzura-castella",
    shopId: "shop-uzura",
    name: "うずらんかすていら キューブ",
    price: 430,
    description: "うずら卵でしっとり、ふんわり仕上げた、手軽なキューブサイズのカステラ。",
    emoji: "🧁",
    tags: ["室蘭みやげ", "要冷蔵"],
    soldCount: 820,
    last30DaysSold: 96,
  },
  {
    id: "p-uzura-seasoned-eggs",
    shopId: "shop-uzura",
    name: "味付うずら卵 10個",
    price: 498,
    description: "かつお風味のしょうゆ味。おつまみやお弁当にそのまま使える味付うずら卵。",
    emoji: "🥚",
    tags: ["おつまみ", "常温保存"],
    soldCount: 970,
    last30DaysSold: 110,
  },

  // やきとりの一平 本店
  {
    id: "p-ippei-10",
    shopId: "shop-ippei",
    name: "一平の室蘭やきとりセット（10本）",
    price: 2400,
    description: "豚肩ロースと玉ねぎを備長炭で焼き上げた、一平の室蘭やきとりセット。",
    emoji: "🍢",
    tags: ["人気", "チルド"],
    soldCount: 2100,
    last30DaysSold: 230,
  },
  {
    id: "p-ippei-20",
    shopId: "shop-ippei",
    name: "室蘭やきとり20本（10本入り×2）",
    price: 4800,
    description: "タレと洋がらし付き。家族や仲間と楽しみやすい20本入りのセット。",
    emoji: "🍢",
    tags: ["ギフト", "チルド"],
    soldCount: 1700,
    last30DaysSold: 180,
  },
  {
    id: "p-ippei-local-set",
    shopId: "shop-ippei",
    name: "室蘭ご当地グルメセット",
    price: 5300,
    description: "室蘭やきとり20本と、室蘭カレーラーメン2食を組み合わせたご当地セット。",
    emoji: "🎁",
    tags: ["室蘭名物", "贈り物"],
    soldCount: 980,
    last30DaysSold: 120,
  },

  // 室蘭やきとり 伊勢広
  {
    id: "p-isehiro-set",
    shopId: "shop-isehiro",
    name: "伊勢広の室蘭やきとりセット（10本）",
    price: 1430,
    description: "やわらかな道産豚肩ロースを、あっさりした特製ダレで味わう10本セット。",
    emoji: "🔥",
    tags: ["人気", "店頭限定"],
    soldCount: 1250,
    last30DaysSold: 145,
  },
  {
    id: "p-isehiro-single",
    shopId: "shop-isehiro",
    name: "室蘭やきとり（1本）",
    price: 170,
    description: "豚肉、玉ねぎ、洋がらしで楽しむ伊勢広の室蘭流。一本から注文できます。",
    emoji: "🍢",
    tags: ["店頭限定"],
    soldCount: 3940,
    last30DaysSold: 420,
  },
  {
    id: "p-isehiro-oden",
    shopId: "shop-isehiro",
    name: "室蘭昆布のおでん盛り合わせ",
    price: 750,
    description: "室蘭産昆布のだしを生かした、やきとりと一緒に楽しみたいおでん。",
    emoji: "🍲",
    tags: ["室蘭昆布", "店頭限定"],
    soldCount: 650,
    last30DaysSold: 72,
  },

  // 味の大王 室蘭本店
  {
    id: "p-daio-curry-ramen",
    shopId: "shop-daio",
    name: "元祖 室蘭カレーラーメン",
    price: 1000,
    description: "自家製ちぢれ麺に、濃厚でコクのある秘伝のカレースープを絡めた室蘭名物。",
    emoji: "🍜",
    tags: ["人気", "店頭限定"],
    soldCount: 2200,
    last30DaysSold: 250,
  },
  {
    id: "p-daio-curry-chashu",
    shopId: "shop-daio",
    name: "カレーチャーシューラーメン",
    price: 1650,
    description: "カレーラーメンに豚肩ロースのチャーシューを加えた、食べ応えのある一杯。",
    emoji: "🍜",
    tags: ["肉盛り", "店頭限定"],
    soldCount: 1250,
    last30DaysSold: 140,
  },
  {
    id: "p-daio-hokki-gyoza",
    shopId: "shop-daio",
    name: "手延べホッキぎょうざ",
    price: 550,
    description: "室蘭らしい海の味を楽しめる、カレーラーメンのお供にぴったりな手延べ餃子。",
    emoji: "🥟",
    tags: ["海の幸", "店頭限定"],
    soldCount: 730,
    last30DaysSold: 80,
  },
]

/** ホーム画面に表示する、室蘭の定番スポットと食文化。 */
export const townEvents: TownEvent[] = [
  {
    id: "muroran-spot-chikyu",
    date: "絶景",
    weekday: "通年",
    title: "地球岬から太平洋を一望",
    location: "母恋南町・地球岬",
    description: "断崖の上から太平洋を見渡せる、室蘭を代表する景勝地。白い灯台も見どころです。",
    tag: "室蘭八景",
    url: "https://muro-kanko.com/see/chikyuumisaki.html",
  },
  {
    id: "muroran-spot-night",
    date: "夜景",
    weekday: "通年",
    title: "白鳥大橋と工場夜景",
    location: "室蘭港・市内展望台",
    description: "港を囲む工場群と白鳥大橋の灯りが重なる、鉄のまちならではの夜景です。",
    tag: "工場夜景",
    url: "https://muro-kanko.com/see/murorankou.html",
  },
  {
    id: "muroran-food-yakitori",
    date: "名物",
    weekday: "通年",
    title: "豚肉・玉ねぎ・洋がらしの室蘭やきとり",
    location: "中島町ほか市内各店",
    description: "豚肉と玉ねぎを串に刺し、各店のタレと洋がらしで味わう室蘭のソウルフード。",
    tag: "ご当地グルメ",
    url: "https://muro-kanko.com/eat-buy/yakitori.html",
  },
  {
    id: "muroran-food-curry",
    date: "名物",
    weekday: "通年",
    title: "室蘭カレーラーメンを食べ歩く",
    location: "中央町ほか市内各店",
    description: "濃厚なカレースープとちぢれ麺が特徴。店ごとの個性を比べるのも楽しみです。",
    tag: "ご当地グルメ",
    url: "https://muro-kanko.com/cat_eat-buy/curry_ramen",
  },
]

export function getShop(id: string): Shop | undefined {
  return shops.find((s) => s.id === id)
}

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

export function formatYen(n: number): string {
  return "¥" + n.toLocaleString("ja-JP")
}
