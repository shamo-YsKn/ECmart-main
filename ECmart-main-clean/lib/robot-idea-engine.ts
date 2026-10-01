import type { RobotBase, RobotConfig, RobotItem, RobotPose, RobotView } from "@/lib/types"
import { DEFAULT_ROBOT_CONFIG, defaultRobotName, normalizeRobotConfig } from "@/lib/robot-config"
import { suggestCustomItemIdea, type CustomItemIdeaProposal } from "@/lib/custom-item-idea-engine"

export const ROBOT_IDEA_AI_PREFERENCE_KEY = "machinowa:robot-idea-ai-enabled"
export const ROBOT_IDEA_ENGINE_VERSION = "rule-v2-workbench" as const
export const EXTERNAL_AI_PROVIDER_CONFIGURED = false as const

export type RobotIdeaProvider = "rules" | "external"

export interface RobotIdeaColorOption {
  label: string
  value: string
}

export interface RobotIdeaContext {
  currentConfig?: RobotConfig
  availableItems?: readonly RobotItem[]
  availableBodyColors?: readonly RobotIdeaColorOption[]
  availableAccentColors?: readonly RobotIdeaColorOption[]
  requestedProvider?: RobotIdeaProvider
}

export interface RobotIdeaCandidate {
  id: string
  title: string
  summary: string
  themeId: string
  themeLabel: string
  matchedKeywords: string[]
  config: RobotConfig
  reasons: string[]
  futureCustomItemHint?: string
  customItemProposal?: CustomItemIdeaProposal
}

export interface RobotIdeaResult {
  engineVersion: typeof ROBOT_IDEA_ENGINE_VERSION
  query: string
  requestedProvider: RobotIdeaProvider
  providerUsed: "rules"
  externalProviderConfigured: boolean
  fallbackReason?: string
  matchedThemeIds: string[]
  candidates: RobotIdeaCandidate[]
}

type ThemeRule = {
  id: string
  label: string
  keywords: readonly string[]
  pose: RobotPose
  altPose: RobotPose
  item: RobotItem
  futureCustomItemHint?: string
  summary: string
}

const THEMES: readonly ThemeRule[] = [
  { id: "fishing", label: "釣り", keywords: ["釣り", "釣る", "魚", "フィッシング", "海釣り"], pose: "point", altPose: "stand", item: "none", futureCustomItemHint: "釣竿", summary: "釣りを楽しむ姿を、道具を持てるポーズ中心で提案します。" },
  { id: "music", label: "音楽・楽器", keywords: ["ギター", "クラリネット", "サックス", "フルート", "トランペット", "楽器", "演奏", "音楽", "バンド"], pose: "stand", altPose: "cheer", item: "none", futureCustomItemHint: "楽器", summary: "演奏する雰囲気を優先し、腕を使いやすい姿勢にします。" },
  { id: "yakitori", label: "室蘭やきとり", keywords: ["やきとり", "焼き鳥", "豚精肉", "からし"], pose: "stand", altPose: "point", item: "none", futureCustomItemHint: "やきとり串", summary: "室蘭らしい食文化をモチーフにした構成です。" },
  { id: "bike", label: "バイク・乗り物", keywords: ["バイク", "オートバイ", "自転車", "乗り物", "ライダー", "ツーリング"], pose: "stand", altPose: "point", item: "none", futureCustomItemHint: "バイク／自転車", summary: "乗り物と組み合わせやすい落ち着いた姿勢を提案します。" },
  { id: "factory", label: "工場・ものづくり", keywords: ["工場", "ものづくり", "製造", "鉄鋼", "鉄のまち", "室蘭", "製鉄", "機械"], pose: "point", altPose: "stand", item: "gear", summary: "鉄のまち・ものづくりの印象を歯車や工具で表現します。" },
  { id: "maintenance", label: "整備・工具", keywords: ["整備", "修理", "工具", "メカニック", "スパナ", "レンチ"], pose: "stand", altPose: "point", item: "wrench", summary: "工具を持った作業スタイルを中心に提案します。" },
  { id: "gear", label: "歯車・機械", keywords: ["歯車", "ギア", "メカ", "ロボットらしい"], pose: "point", altPose: "cheer", item: "gear", summary: "機械らしさを歯車と動きのあるポーズで強調します。" },
  { id: "flower", label: "花・園芸", keywords: ["花", "お花", "ガーデニング", "園芸", "植物", "花束"], pose: "wave", altPose: "stand", item: "flower", summary: "花を持ったやわらかい雰囲気の構成です。" },
  { id: "love", label: "ハート・記念", keywords: ["ハート", "好き", "恋", "告白", "カップル", "記念日", "バレンタイン"], pose: "wave", altPose: "cheer", item: "heart", summary: "ハートを使って気持ちが伝わる構成にします。" },
  { id: "greeting", label: "あいさつ", keywords: ["手を振", "手をふ", "挨拶", "あいさつ", "こんにちは", "歓迎", "おて振り"], pose: "wave", altPose: "cheer", item: "none", summary: "正面から伝わりやすい、おて振り中心の構成です。" },
  { id: "celebration", label: "お祝い・元気", keywords: ["ばんざい", "万歳", "お祝い", "喜ぶ", "元気", "応援", "盛り上が", "祭り", "フェス"], pose: "cheer", altPose: "wave", item: "none", summary: "両腕を上げた元気な印象を中心に提案します。" },
  { id: "guide", label: "案内・指さし", keywords: ["指差", "指さ", "案内", "紹介", "示す", "こっち", "あっち"], pose: "point", altPose: "wave", item: "none", summary: "方向や対象を示しやすい指さしポーズを使います。" },
  { id: "formal", label: "シンプル・直立", keywords: ["シンプル", "直立", "きをつけ", "真面目", "落ち着", "静か", "普通"], pose: "stand", altPose: "wave", item: "none", summary: "装飾を抑えた、使いやすい基本構成です。" },
  { id: "photo", label: "写真・カメラ", keywords: ["写真", "カメラ", "撮影", "ハイチーズ", "フォト"], pose: "point", altPose: "stand", item: "none", futureCustomItemHint: "カメラ", summary: "撮影シーンを想像しやすい姿勢を提案します。" },
  { id: "sports", label: "スポーツ", keywords: ["スポーツ", "野球", "サッカー", "ゴルフ", "筋トレ", "運動", "競技"], pose: "cheer", altPose: "point", item: "none", futureCustomItemHint: "スポーツ用具", summary: "動きのあるスポーツらしい姿勢を中心にします。" },
  { id: "dance", label: "ダンス", keywords: ["ダンス", "踊る", "バレエ", "ラインダンス"], pose: "cheer", altPose: "wave", item: "none", summary: "腕を大きく使った動きのある印象にします。" },
  { id: "reading", label: "読書・勉強", keywords: ["読書", "本", "勉強", "読む", "研究", "学習"], pose: "stand", altPose: "point", item: "none", futureCustomItemHint: "本／資料", summary: "落ち着いた姿勢で知的な雰囲気を作ります。" },
  { id: "magic", label: "魔法・ファンタジー", keywords: ["魔法", "魔法使い", "ファンタジー", "杖", "魔術"], pose: "point", altPose: "cheer", item: "none", futureCustomItemHint: "魔法の杖", summary: "指さしや腕上げで魔法を使うような構成にします。" },
  { id: "sea", label: "海・港", keywords: ["海", "港", "船", "フェリー", "白鳥大橋", "海辺"], pose: "wave", altPose: "point", item: "none", summary: "港町らしい爽やかな印象を作ります。" },
  { id: "winter", label: "冬・雪", keywords: ["雪", "冬", "スキー", "雪だるま", "寒い"], pose: "cheer", altPose: "stand", item: "none", futureCustomItemHint: "スキー／雪小物", summary: "冬の屋外シーンに合う元気な構成です。" },
  { id: "art", label: "アート・制作", keywords: ["絵", "画伯", "アート", "芸術", "描く", "工作", "制作"], pose: "point", altPose: "stand", item: "none", futureCustomItemHint: "筆／作品", summary: "制作中の手元を見せやすい構成にします。" },
  { id: "cafe", label: "カフェ・給仕", keywords: ["カフェ", "喫茶", "ウェイター", "店員", "お茶", "コーヒー"], pose: "stand", altPose: "wave", item: "none", futureCustomItemHint: "トレー／カップ", summary: "接客シーンに使いやすい落ち着いた構成です。" },
  { id: "stargazing", label: "天体観測", keywords: ["星", "天体", "望遠鏡", "宇宙", "天文"], pose: "point", altPose: "stand", item: "none", futureCustomItemHint: "望遠鏡", summary: "空や観測対象を示す姿勢を中心にします。" },
  { id: "samurai", label: "武将・忍者", keywords: ["武将", "侍", "忍者", "刀", "槍", "戦国"], pose: "point", altPose: "stand", item: "none", futureCustomItemHint: "刀／槍", summary: "武器や装備を追加しやすい力強い構成です。" },
  { id: "cooking", label: "料理", keywords: ["料理", "フライパン", "調理", "シェフ", "キッチン", "食べ物"], pose: "stand", altPose: "point", item: "none", futureCustomItemHint: "調理器具", summary: "手元に道具を持たせやすい姿勢にします。" },
  { id: "gift", label: "プレゼント", keywords: ["プレゼント", "贈り物", "ギフト", "誕生日"], pose: "wave", altPose: "cheer", item: "flower", futureCustomItemHint: "プレゼント箱", summary: "贈り物を渡す場面に使いやすい明るい構成です。" },
]

const FALLBACK_THEME: ThemeRule = {
  id: "free",
  label: "自由イメージ",
  keywords: [],
  pose: "wave",
  altPose: "stand",
  item: "none",
  summary: "入力文から明確な既知テーマが見つからないため、使いやすい基本案を提案します。",
}

function normalizeText(input: string) {
  return input.normalize("NFKC").trim().toLowerCase()
}

function matchThemes(text: string) {
  return THEMES.map((theme, order) => {
    const matched = theme.keywords.filter((keyword) => text.includes(keyword.toLowerCase()))
    const score = matched.reduce((sum, keyword) => sum + Math.max(1, keyword.length), 0)
    return { theme, matched, score, order }
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
}

function explicitBase(text: string): RobotBase | undefined {
  const hasVolta = text.includes("ボルタ") || text.includes("volta")
  const hasNatty = text.includes("ナッティ") || text.includes("natty")
  if (hasVolta && !hasNatty) return "volta"
  if (hasNatty && !hasVolta) return "natty"
  return undefined
}

function explicitView(text: string): RobotView | undefined {
  if (text.includes("右側面") || text.includes("右から") || text.includes("右向き")) return "side-right"
  if (text.includes("左側面") || text.includes("左から") || text.includes("左向き")) return "side"
  if (text.includes("背面") || text.includes("後ろ姿") || text.includes("後ろから")) return "back"
  if (text.includes("正面") || text.includes("前から")) return "front"
  return undefined
}

function explicitPose(text: string): RobotPose | undefined {
  if (text.includes("ばんざい") || text.includes("万歳") || text.includes("両手を上げ")) return "cheer"
  if (text.includes("手を振") || text.includes("手をふ") || text.includes("おて振り")) return "wave"
  if (text.includes("指差") || text.includes("指さ") || text.includes("指をさ")) return "point"
  if (text.includes("きをつけ") || text.includes("直立")) return "stand"
  return undefined
}

function explicitItem(text: string): RobotItem | undefined {
  if (text.includes("スパナ") || text.includes("レンチ")) return "wrench"
  if (text.includes("歯車") || text.includes("ギア")) return "gear"
  if (text.includes("ハート")) return "heart"
  if (text.includes("花") || text.includes("花束")) return "flower"
  return undefined
}

const COLOR_KEYWORDS: readonly { words: readonly string[]; value: string }[] = [
  { words: ["真鍮", "しんちゅう", "金色", "ゴールド"], value: "#c9a24b" },
  { words: ["白銀", "しろがね", "銀色", "シルバー"], value: "#eceeef" },
  { words: ["黒鉄", "くろがね", "黒いボディ"], value: "#8d9194" },
  { words: ["青いボディ", "青のボディ", "青色のボディ", "青いボルタ", "青いナッティ", "あおがね", "ブルーのボディ"], value: "#5b8c9c" },
  { words: ["緑のボディ", "緑色のボディ", "緑のボルタ", "緑のナッティ", "グリーンのボディ", "もえぎ"], value: "#7ba05b" },
  { words: ["ピンクのボディ", "ピンクのボルタ", "ピンクのナッティ", "うすべに", "桃色のボディ"], value: "#d98aa0" },
  { words: ["オレンジのボディ", "オレンジのボルタ", "オレンジのナッティ", "レンガ"], value: "#e8842f" },
]

const ACCENT_KEYWORDS: readonly { words: readonly string[]; value: string }[] = [
  { words: ["黒い目", "黒目"], value: "#111111" },
  { words: ["黄色い目", "黄色の目", "たまご色の目"], value: "#ffcf4d" },
  { words: ["青い目", "青の目", "水色の目"], value: "#5fb6d1" },
  { words: ["緑の目", "緑色の目"], value: "#6fbf73" },
  { words: ["ピンクの目", "桜色の目"], value: "#e86a8f" },
  { words: ["オレンジの目", "橙色の目"], value: "#f08a3c" },
]

function requestedAvailableColor(
  text: string,
  available: readonly RobotIdeaColorOption[] | undefined,
  patterns: readonly { words: readonly string[]; value: string }[],
) {
  if (!available?.length) return undefined
  const requested = patterns.find((pattern) => pattern.words.some((word) => text.includes(word.toLowerCase())))
  if (!requested) return undefined
  return available.some((option) => option.value.toLowerCase() === requested.value.toLowerCase())
    ? requested.value
    : undefined
}

function requestedUnavailableColor(
  text: string,
  available: readonly RobotIdeaColorOption[] | undefined,
  patterns: readonly { words: readonly string[]; value: string }[],
) {
  const requested = patterns.find((pattern) => pattern.words.some((word) => text.includes(word.toLowerCase())))
  if (!requested || !available?.length) return false
  return !available.some((option) => option.value.toLowerCase() === requested.value.toLowerCase())
}

function safeItem(item: RobotItem, available: readonly RobotItem[]) {
  return available.includes(item) ? item : "none"
}

function candidateConfig(
  current: RobotConfig,
  args: {
    base: RobotBase
    pose: RobotPose
    item: RobotItem
    view: RobotView
    bodyColor?: string
    accentColor?: string
    name: string
  },
) {
  return normalizeRobotConfig({
    ...current,
    base: args.base,
    name: args.name,
    pose: args.pose,
    poseState: { mode: "preset", preset: args.pose, joints: {}, axes: { front: {}, side: {} }, spatial: {} },
    item: args.item,
    heldItem: { kind: "builtin", item: args.item },
    view: args.view,
    bodyColor: args.bodyColor ?? current.bodyColor,
    accentColor: args.accentColor ?? current.accentColor,
  })
}

function candidateTitle(theme: ThemeRule, base: RobotBase, suffix?: string) {
  const baseName = defaultRobotName(base)
  const text = suffix ? `${theme.label} ${baseName}・${suffix}` : `${theme.label} ${baseName}`
  return text.slice(0, 40)
}

/**
 * 外部通信を行わない提案エンジン。
 * requestedProvider="external" でも接続先未設定の間は必ず rules にフォールバックします。
 */
export function suggestRobotIdeas(input: string, context: RobotIdeaContext = {}): RobotIdeaResult {
  const query = input.trim().slice(0, 240)
  const text = normalizeText(query)
  const current = normalizeRobotConfig(context.currentConfig ?? DEFAULT_ROBOT_CONFIG)
  const requestedProvider = context.requestedProvider ?? "rules"
  const availableItems = context.availableItems?.length ? [...context.availableItems] : (["none", "wrench", "flower", "gear", "heart"] as RobotItem[])
  const matched = matchThemes(text)
  const explicitBaseValue = explicitBase(text)
  const explicitPoseValue = explicitPose(text)
  const explicitItemValue = explicitItem(text)
  const explicitViewValue = explicitView(text)
  const bodyColor = requestedAvailableColor(text, context.availableBodyColors, COLOR_KEYWORDS)
  const accentColor = requestedAvailableColor(text, context.availableAccentColors, ACCENT_KEYWORDS)
  const unavailableBodyColor = requestedUnavailableColor(text, context.availableBodyColors, COLOR_KEYWORDS)
  const unavailableAccentColor = requestedUnavailableColor(text, context.availableAccentColors, ACCENT_KEYWORDS)

  const primary = matched[0]?.theme ?? FALLBACK_THEME
  const secondary = matched[1]?.theme
  const base = explicitBaseValue ?? current.base
  const alternateBase: RobotBase = explicitBaseValue ? base : base === "volta" ? "natty" : "volta"
  const primaryItem = safeItem(explicitItemValue ?? primary.item, availableItems)
  const requestedItemLocked = Boolean((explicitItemValue ?? primary.item) !== "none" && primaryItem === "none")
  const reasonsBase = [
    matched.length ? `「${matched[0].matched.join("・")}」から「${primary.label}」テーマを選びました。` : "既知テーマに限定せず、使いやすい基本構成として解釈しました。",
    ...(unavailableBodyColor || unavailableAccentColor ? ["指定された色に未解放のものがあるため、現在使える色を維持しました。"] : []),
    ...(requestedItemLocked ? ["指定・推定した持ち物が未解放のため、持ち物なしへ安全に調整しました。"] : []),
  ]

  const firstPose = explicitPoseValue ?? primary.pose
  const firstView = explicitViewValue ?? "front"
  const candidates: RobotIdeaCandidate[] = []

  const firstTitle = candidateTitle(primary, base)
  candidates.push({
    id: `${primary.id}-primary`,
    title: firstTitle,
    summary: primary.summary,
    themeId: primary.id,
    themeLabel: primary.label,
    matchedKeywords: matched[0]?.matched ?? [],
    config: candidateConfig(current, {
      base,
      pose: firstPose,
      item: primaryItem,
      view: firstView,
      bodyColor,
      accentColor,
      name: firstTitle,
    }),
    reasons: [...reasonsBase, "入力の意味を優先した第一候補です。"],
    ...(primary.futureCustomItemHint ? { futureCustomItemHint: primary.futureCustomItemHint } : {}),
    ...(primary.futureCustomItemHint ? { customItemProposal: suggestCustomItemIdea(query, primary.futureCustomItemHint) ?? undefined } : {}),
  })

  const secondTheme = secondary ?? primary
  const secondItem = safeItem(explicitItemValue ?? secondTheme.item, availableItems)
  const secondPose = explicitPoseValue ?? (secondary ? secondTheme.pose : primary.altPose)
  const secondTitle = candidateTitle(secondTheme, base, "動き重視")
  candidates.push({
    id: `${secondTheme.id}-active`,
    title: secondTitle,
    summary: secondary ? secondTheme.summary : `「${primary.label}」を少し動きのあるポーズで表現します。`,
    themeId: secondTheme.id,
    themeLabel: secondTheme.label,
    matchedKeywords: secondary ? matched[1].matched : matched[0]?.matched ?? [],
    config: candidateConfig(current, {
      base,
      pose: secondPose,
      item: secondItem,
      view: explicitViewValue ?? "front",
      bodyColor,
      accentColor,
      name: secondTitle,
    }),
    reasons: [
      ...(secondary ? [`入力には「${secondary.label}」の要素もあるため別解として採用しました。`] : [`同じ「${primary.label}」を別ポーズで比較できる案です。`]),
      "完成後に自由ポーズで微調整できます。",
    ],
    ...(secondTheme.futureCustomItemHint ? { futureCustomItemHint: secondTheme.futureCustomItemHint } : {}),
    ...(secondTheme.futureCustomItemHint ? { customItemProposal: suggestCustomItemIdea(query, secondTheme.futureCustomItemHint) ?? undefined } : {}),
  })

  const simpleTitle = candidateTitle(primary, alternateBase, "シンプル")
  candidates.push({
    id: `${primary.id}-simple`,
    title: simpleTitle,
    summary: "持ち物を減らし、工房であとから調整しやすいシンプル案です。",
    themeId: primary.id,
    themeLabel: primary.label,
    matchedKeywords: matched[0]?.matched ?? [],
    config: candidateConfig(current, {
      base: alternateBase,
      pose: explicitPoseValue ?? (primary.id === "formal" ? "stand" : "wave"),
      item: "none",
      view: explicitViewValue ?? "front",
      bodyColor,
      accentColor,
      name: simpleTitle,
    }),
    reasons: [
      explicitBaseValue ? `${defaultRobotName(base)}指定を維持した軽量案です。` : `${defaultRobotName(alternateBase)}でも比較できるようタイプを変えました。`,
      "標準持ち物なしなので、あとから工房で足し引きしやすい案です。",
    ],
    ...(primary.futureCustomItemHint ? { futureCustomItemHint: primary.futureCustomItemHint } : {}),
  })

  return {
    engineVersion: ROBOT_IDEA_ENGINE_VERSION,
    query,
    requestedProvider,
    providerUsed: "rules",
    externalProviderConfigured: EXTERNAL_AI_PROVIDER_CONFIGURED,
    ...(requestedProvider === "external" && !EXTERNAL_AI_PROVIDER_CONFIGURED
      ? { fallbackReason: "外部AIの接続先が未設定のため、ルールベースで提案しました。" }
      : {}),
    matchedThemeIds: matched.slice(0, 3).map((entry) => entry.theme.id),
    candidates,
  }
}
