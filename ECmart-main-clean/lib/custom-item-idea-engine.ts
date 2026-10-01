import type { CustomItemDocument, CustomItemPartPlacement, WorkbenchPartType } from "@/lib/creation-model"
import { CREATION_DOCUMENT_VERSION } from "@/lib/creation-model"
import { alignPartSocketToWorldPoint, socketWorldPoint3D } from "@/lib/workbench-snap"

export const CUSTOM_ITEM_IDEA_ENGINE_VERSION = "rules-v1" as const

export type CustomItemIdeaTemplateId =
  | "fishing-rod"
  | "guitar"
  | "clarinet"
  | "yakitori"
  | "bike"
  | "camera"
  | "book"
  | "magic-wand"
  | "skis"
  | "paint-brush"
  | "tray-cup"
  | "telescope"
  | "sword"
  | "spear"
  | "frying-pan"
  | "gift-box"
  | "sports-tool"

export interface CustomItemIdeaProposal {
  id: string
  templateId: CustomItemIdeaTemplateId
  title: string
  summary: string
  matchedKeywords: string[]
  document: CustomItemDocument
  notes: string[]
}

type RawPart = {
  id: string
  type: WorkbenchPartType
  x: number
  y: number
  z?: number
  rotation?: number
  scale?: number
  attach?: { parentId: string; parentSocket: string; ownSocket: string }
}

type TemplateRule = {
  id: CustomItemIdeaTemplateId
  title: string
  keywords: readonly string[]
  hintKeywords?: readonly string[]
  summary: string
  notes: readonly string[]
  parts: readonly RawPart[]
}

function placement(raw: RawPart): CustomItemPartPlacement {
  return {
    instanceId: raw.id,
    partType: raw.type,
    transform: {
      position: [raw.x, raw.y, raw.z ?? 0],
      rotationDeg: [0, 0, raw.rotation ?? 0],
      scale: [raw.scale ?? 1, raw.scale ?? 1, raw.scale ?? 1],
    },
  }
}

/**
 * Templateのattach指定を、工作台と同じsocket計算で実座標へ変換する。
 * そのため読み込み後に接続再計算が走っても大きく飛びにくい。
 */
function buildParts(rawParts: readonly RawPart[]): CustomItemPartPlacement[] {
  const built: CustomItemPartPlacement[] = []
  for (const raw of rawParts) {
    let next = placement(raw)
    if (raw.attach) {
      const parent = built.find((entry) => entry.instanceId === raw.attach!.parentId)
      const target = parent ? socketWorldPoint3D(parent, raw.attach.parentSocket) : null
      const aligned = target ? alignPartSocketToWorldPoint(next, raw.attach.ownSocket, target) : null
      if (parent && aligned) {
        next = {
          ...aligned,
          attachedTo: {
            instanceId: parent.instanceId,
            socketId: raw.attach.parentSocket,
            ownSocketId: raw.attach.ownSocket,
          },
        }
      }
    }
    built.push(next)
  }
  return built
}

function documentFor(rule: TemplateRule): CustomItemDocument {
  return {
    schemaVersion: CREATION_DOCUMENT_VERSION,
    kind: "custom-item",
    name: rule.title,
    editorMode: "2d",
    coordinateSpace: "item-workbench-v2",
    parts: buildParts(rule.parts),
  }
}

const TEMPLATES: readonly TemplateRule[] = [
  {
    id: "fishing-rod",
    title: "釣竿（提案）",
    keywords: ["釣竿", "つりざお", "釣り竿", "釣り", "フィッシング"],
    hintKeywords: ["釣竿"],
    summary: "金属棒を竿、針金を糸、ワッシャーをリールに見立てた軽量構成です。",
    notes: ["長いだけで大型判定されにくい構成", "工作台で竿の角度や糸の長さを調整できます"],
    parts: [
      { id: "rod", type: "metal_rod", x: -20, y: 10, rotation: -28, scale: 1.35 },
      { id: "reel", type: "washer", x: -65, y: 42, scale: 0.55 },
      { id: "line", type: "wire", x: 110, y: -55, rotation: -65, scale: 1.05 },
      { id: "hook", type: "hex_nut", x: 155, y: 30, scale: 0.35 },
    ],
  },
  {
    id: "guitar",
    title: "ギター（提案）",
    keywords: ["ギター", "エレキ", "アコギ"],
    hintKeywords: ["楽器"],
    summary: "ワッシャーとナットを胴、金属棒をネック、針金を弦に見立てた構成です。",
    notes: ["演奏用の詳細小物を想定", "工作台で胴の大きさやネック角度を調整できます"],
    parts: [
      { id: "body-a", type: "washer", x: -35, y: 25, scale: 1.0 },
      { id: "body-b", type: "hex_nut", x: 12, y: 22, scale: 0.9 },
      { id: "body-c", type: "washer", x: -8, y: 70, scale: 0.72 },
      { id: "neck", type: "metal_rod", x: 70, y: -42, rotation: -55, scale: 1.0 },
      { id: "head", type: "hex_nut", x: 122, y: -106, scale: 0.42 },
      { id: "string-1", type: "wire", x: 44, y: -18, rotation: -54, scale: 0.75 },
      { id: "string-2", type: "wire", x: 55, y: -10, rotation: -54, scale: 0.68 },
      { id: "bridge", type: "flat_head_screw", x: -18, y: 30, rotation: 90, scale: 0.55 },
    ],
  },
  {
    id: "clarinet",
    title: "クラリネット（提案）",
    keywords: ["クラリネット"],
    hintKeywords: ["楽器"],
    summary: "細長い金属部品と小さなキー部品でクラリネット風の外形を作ります。",
    notes: ["公式価格アンカーの『詳細小物』を意識した構成", "キー部分は工作台で増減できます"],
    parts: [
      { id: "tube-1", type: "metal_rod", x: 0, y: 10, rotation: 90, scale: 1.15 },
      { id: "tube-2", type: "bolt", x: 0, y: -75, rotation: 90, scale: 0.72, attach: { parentId: "tube-1", parentSocket: "start", ownSocket: "head" } },
      { id: "bell", type: "washer", x: 0, y: 105, scale: 0.7, attach: { parentId: "tube-1", parentSocket: "end", ownSocket: "center" } },
      { id: "key-1", type: "hex_nut", x: -28, y: -5, scale: 0.3, attach: { parentId: "bell", parentSocket: "left", ownSocket: "center" } },
      { id: "key-2", type: "hex_nut", x: 28, y: 20, scale: 0.3, attach: { parentId: "bell", parentSocket: "right", ownSocket: "center" } },
      { id: "key-3", type: "washer", x: -24, y: 50, scale: 0.25 },
      { id: "key-4", type: "washer", x: 24, y: 75, scale: 0.25 },
      { id: "mouth", type: "flat_head_screw", x: 0, y: -150, rotation: 90, scale: 0.45, attach: { parentId: "tube-2", parentSocket: "shaft", ownSocket: "head" } },
    ],
  },
  {
    id: "yakitori",
    title: "室蘭やきとり串（提案）",
    keywords: ["やきとり", "焼き鳥", "豚精肉", "串"],
    hintKeywords: ["やきとり串"],
    summary: "金属棒を串、ナットとワッシャーを具材に見立てた室蘭やきとり風です。",
    notes: ["複数の具材を連ねる高複雑度寄りの構成", "玉ねぎ風の間隔は工作台で調整できます"],
    parts: [
      { id: "skewer", type: "metal_rod", x: 0, y: 0, rotation: -18, scale: 1.25 },
      { id: "meat-1", type: "hex_nut", x: -92, y: 30, scale: 0.55, attach: { parentId: "skewer", parentSocket: "start", ownSocket: "center" } },
      { id: "onion-1", type: "washer", x: -52, y: 15, scale: 0.45, attach: { parentId: "meat-1", parentSocket: "right", ownSocket: "center" } },
      { id: "meat-2", type: "hex_nut", x: -10, y: 3, scale: 0.55, attach: { parentId: "onion-1", parentSocket: "right", ownSocket: "center" } },
      { id: "onion-2", type: "washer", x: 35, y: -10, scale: 0.45, attach: { parentId: "meat-2", parentSocket: "right", ownSocket: "center" } },
      { id: "meat-3", type: "hex_nut", x: 80, y: -24, scale: 0.55, attach: { parentId: "onion-2", parentSocket: "right", ownSocket: "center" } },
      { id: "onion-3", type: "washer", x: 110, y: -30, scale: 0.45, attach: { parentId: "meat-3", parentSocket: "right", ownSocket: "center" } },
      { id: "meat-4", type: "hex_nut", x: 140, y: -36, scale: 0.55, attach: { parentId: "onion-3", parentSocket: "right", ownSocket: "center" } },
      { id: "tip", type: "pan_head_screw", x: 175, y: -42, rotation: -18, scale: 0.42, attach: { parentId: "meat-4", parentSocket: "right", ownSocket: "head" } },
      { id: "mustard", type: "led_yellow", x: 40, y: -55, rotation: -18, scale: 0.35, attach: { parentId: "onion-2", parentSocket: "top", ownSocket: "lead-left" } },
      { id: "mustard-2", type: "led_yellow", x: 88, y: -62, rotation: -18, scale: 0.3, attach: { parentId: "onion-3", parentSocket: "top", ownSocket: "lead-left" } },
    ],
  },
  {
    id: "bike",
    title: "バイク（提案）",
    keywords: ["バイク", "オートバイ", "ライダー", "ツーリング"],
    hintKeywords: ["バイク", "自転車"],
    summary: "2つの車輪と複数のフレーム・ばねで、横にも縦にも広がる大型構造を作ります。",
    notes: ["大型・機械構造Tierを想定", "車輪間隔やハンドル位置を工作台で調整できます"],
    parts: [
      { id: "wheel-a", type: "washer", x: -250, y: 78, scale: 1.1 },
      { id: "wheel-b", type: "washer", x: 250, y: 78, scale: 1.1 },
      { id: "frame-1", type: "metal_rod", x: -125, y: 22, rotation: 18, scale: 1.2 },
      { id: "frame-2", type: "metal_rod", x: 125, y: 20, rotation: -20, scale: 1.2 },
      { id: "frame-3", type: "metal_rod", x: 0, y: 65, rotation: 0, scale: 1.3 },
      { id: "fork", type: "metal_rod", x: 205, y: 8, rotation: 68, scale: 0.9 },
      { id: "handle", type: "metal_rod", x: 210, y: -75, rotation: 2, scale: 0.65 },
      { id: "seat", type: "bolt", x: -35, y: -50, rotation: 5, scale: 0.65 },
      { id: "engine", type: "hex_nut", x: 15, y: 20, scale: 0.95 },
      { id: "engine-2", type: "washer", x: 15, y: 20, z: 38, scale: 0.75 },
      { id: "spring", type: "spring", x: -60, y: 40, z: -28, rotation: 68, scale: 0.75 },
      { id: "light", type: "led_yellow", x: 260, y: -38, z: 18, rotation: -15, scale: 0.48 },
    ],
  },
  {
    id: "camera",
    title: "カメラ（提案）",
    keywords: ["カメラ", "写真", "撮影"],
    hintKeywords: ["カメラ"],
    summary: "ナットを本体、ワッシャーをレンズ、ねじをグリップに見立てます。",
    notes: ["小型の標準〜詳細小物向け", "レンズ径を工作台で変更できます"],
    parts: [
      { id: "body", type: "hex_nut", x: 0, y: 0, scale: 1.05 },
      { id: "lens", type: "washer", x: 12, y: 0, z: 24, scale: 0.75 },
      { id: "grip", type: "flat_head_screw", x: -72, y: 25, rotation: 90, scale: 0.52 },
      { id: "flash", type: "led_yellow", x: 20, y: -58, scale: 0.42 },
      { id: "strap", type: "wire", x: 75, y: 32, rotation: 45, scale: 0.55 },
    ],
  },
  {
    id: "book",
    title: "本・資料（提案）",
    keywords: ["本", "読書", "資料", "教科書"],
    hintKeywords: ["本", "資料"],
    summary: "薄いワッシャーと金属棒で開いた本の輪郭を簡潔に表現します。",
    notes: ["通常価格帯に収まりやすい軽量構成"],
    parts: [
      { id: "page-a", type: "washer", x: -38, y: 0, scale: 0.75 },
      { id: "page-b", type: "washer", x: 38, y: 0, scale: 0.75 },
      { id: "spine", type: "metal_rod", x: 0, y: 5, rotation: 90, scale: 0.42 },
    ],
  },
  {
    id: "magic-wand",
    title: "魔法の杖（提案）",
    keywords: ["魔法の杖", "杖", "ワンド"],
    hintKeywords: ["魔法の杖"],
    summary: "金属棒を軸に、LEDを先端の光として配置します。",
    notes: ["通常価格帯に収まりやすいシンプル構成"],
    parts: [
      { id: "shaft", type: "metal_rod", x: 0, y: 25, rotation: 70, scale: 1.15 },
      { id: "gem", type: "led_red", x: 82, y: -85, rotation: -20, scale: 0.55 },
      { id: "guard", type: "washer", x: -42, y: 78, scale: 0.5 },
    ],
  },
  {
    id: "skis",
    title: "スキー（提案）",
    keywords: ["スキー", "雪板"],
    hintKeywords: ["スキー"],
    summary: "2本の金属棒を板、細い棒をストックに見立てます。",
    notes: ["長さはあるが構造はシンプルな構成"],
    parts: [
      { id: "ski-a", type: "metal_rod", x: -45, y: 35, rotation: 0, scale: 1.45 },
      { id: "ski-b", type: "metal_rod", x: -45, y: 82, rotation: 0, scale: 1.45 },
      { id: "pole-a", type: "metal_rod", x: 70, y: 10, rotation: 68, scale: 0.75 },
      { id: "pole-b", type: "metal_rod", x: 105, y: 20, rotation: 68, scale: 0.75 },
    ],
  },
  {
    id: "paint-brush",
    title: "筆（提案）",
    keywords: ["筆", "ブラシ", "絵筆"],
    hintKeywords: ["筆"],
    summary: "金属棒を柄、ねじとワイヤを穂先として表現します。",
    notes: ["制作シーン向けの軽量小物"],
    parts: [
      { id: "handle", type: "metal_rod", x: -10, y: 10, rotation: -45, scale: 1.0 },
      { id: "ferrule", type: "washer", x: 58, y: -58, scale: 0.45 },
      { id: "bristle", type: "wire", x: 102, y: -102, rotation: -45, scale: 0.5 },
    ],
  },
  {
    id: "tray-cup",
    title: "トレーとカップ（提案）",
    keywords: ["トレー", "カップ", "コーヒー", "お茶"],
    hintKeywords: ["トレー", "カップ"],
    summary: "金属棒をトレー、ナットとワッシャーをカップに見立てます。",
    notes: ["カフェ・給仕テーマ向け"],
    parts: [
      { id: "tray", type: "metal_rod", x: 0, y: 55, rotation: 0, scale: 1.2 },
      { id: "cup", type: "hex_nut", x: -25, y: 5, scale: 0.65 },
      { id: "saucer", type: "washer", x: -25, y: 42, scale: 0.55 },
      { id: "steam", type: "wire", x: -20, y: -55, rotation: 90, scale: 0.42 },
    ],
  },
  {
    id: "telescope",
    title: "望遠鏡（提案）",
    keywords: ["望遠鏡", "天体観測", "天文"],
    hintKeywords: ["望遠鏡"],
    summary: "ボルトと金属棒を鏡筒、三脚を3本の棒で構成します。",
    notes: ["公式通常シリーズにもあるため、過度に複雑にしない構成"],
    parts: [
      { id: "tube", type: "bolt", x: 0, y: -55, rotation: -18, scale: 1.0 },
      { id: "lens", type: "washer", x: 78, y: -82, rotation: -18, scale: 0.52 },
      { id: "tripod-a", type: "metal_rod", x: -35, y: 60, rotation: 70, scale: 0.75 },
      { id: "tripod-b", type: "metal_rod", x: 28, y: 62, rotation: 110, scale: 0.75 },
    ],
  },
  {
    id: "sword",
    title: "刀・剣（提案）",
    keywords: ["刀", "剣", "太刀"],
    hintKeywords: ["刀"],
    summary: "金属棒を刀身、ワッシャーを鍔、ボルトを柄に見立てます。",
    notes: ["武将テーマ向けのシンプル武器"],
    parts: [
      { id: "blade", type: "metal_rod", x: 0, y: -20, rotation: -55, scale: 1.35 },
      { id: "guard", type: "washer", x: -55, y: 50, rotation: -55, scale: 0.48 },
      { id: "handle", type: "bolt", x: -92, y: 98, rotation: -55, scale: 0.55 },
    ],
  },
  {
    id: "spear",
    title: "槍（提案）",
    keywords: ["槍", "やり"],
    hintKeywords: ["槍"],
    summary: "長い金属棒を柄、皿ねじを穂先として表現します。",
    notes: ["長いが単純なため大型Tierへ上げすぎない構成"],
    parts: [
      { id: "shaft", type: "metal_rod", x: 0, y: 0, rotation: -50, scale: 1.65 },
      { id: "tip", type: "flat_head_screw", x: 125, y: -145, rotation: -50, scale: 0.6 },
      { id: "grip", type: "washer", x: -78, y: 92, rotation: -50, scale: 0.45 },
    ],
  },
  {
    id: "frying-pan",
    title: "フライパン（提案）",
    keywords: ["フライパン", "調理器具", "料理"],
    hintKeywords: ["調理器具"],
    summary: "大きなワッシャーを鍋部、金属棒を取っ手として表現します。",
    notes: ["通常シリーズ相当の軽量構成"],
    parts: [
      { id: "pan", type: "washer", x: -35, y: 15, scale: 1.05 },
      { id: "handle", type: "metal_rod", x: 78, y: 15, rotation: 0, scale: 0.85 },
      { id: "joint", type: "hex_nut", x: 24, y: 15, scale: 0.42 },
    ],
  },
  {
    id: "gift-box",
    title: "プレゼント箱（提案）",
    keywords: ["プレゼント", "ギフト", "贈り物", "箱"],
    hintKeywords: ["プレゼント箱"],
    summary: "ナットとワッシャーで箱形を作り、ワイヤをリボンに見立てます。",
    notes: ["装飾は工作台で自由に増減できます"],
    parts: [
      { id: "box-a", type: "hex_nut", x: -35, y: 25, scale: 0.75 },
      { id: "box-b", type: "hex_nut", x: 35, y: 25, scale: 0.75 },
      { id: "lid", type: "metal_rod", x: 0, y: -25, rotation: 0, scale: 0.72 },
      { id: "ribbon-a", type: "wire", x: 0, y: -75, rotation: 38, scale: 0.5 },
      { id: "ribbon-b", type: "wire", x: 0, y: -75, rotation: 142, scale: 0.5 },
    ],
  },
  {
    id: "sports-tool",
    title: "スポーツ用具（提案）",
    keywords: ["野球", "バット", "ゴルフ", "ラケット", "スポーツ", "競技"],
    hintKeywords: ["スポーツ用具"],
    summary: "金属棒を主軸に、ワッシャーとナットで先端形状を作る汎用スポーツ用具です。",
    notes: ["具体的な競技に合わせて工作台で形を整えてください"],
    parts: [
      { id: "shaft", type: "metal_rod", x: 0, y: 0, rotation: -58, scale: 1.2 },
      { id: "head", type: "washer", x: 80, y: -115, rotation: -58, scale: 0.65 },
      { id: "grip", type: "hex_nut", x: -65, y: 98, rotation: -58, scale: 0.42 },
    ],
  },
]

function normalizeText(value: string) {
  return value.normalize("NFKC").trim().toLowerCase()
}

function scoreRule(rule: TemplateRule, query: string, hint: string) {
  const matchedKeywords = rule.keywords.filter((keyword) => query.includes(keyword.toLowerCase()))
  const matchedHints = (rule.hintKeywords ?? []).filter((keyword) => hint.includes(keyword.toLowerCase()))
  const score = matchedKeywords.reduce((sum, keyword) => sum + Math.max(3, keyword.length * 3), 0)
    + matchedHints.reduce((sum, keyword) => sum + Math.max(8, keyword.length * 5), 0)
  return { score, matchedKeywords: [...matchedKeywords, ...matchedHints] }
}

/**
 * ⑤-5: 外部APIなしで文章／RobotIdeaのhintから工作テンプレートを提案する。
 * 対応できない自由語はnullを返し、存在しない部品を捏造しない。
 */
export function suggestCustomItemIdea(query: string, hint = ""): CustomItemIdeaProposal | null {
  const normalizedQuery = normalizeText(query)
  const normalizedHint = normalizeText(hint)
  const ranked = TEMPLATES
    .map((rule, order) => ({ rule, order, ...scoreRule(rule, normalizedQuery, normalizedHint) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)

  const best = ranked[0]
  if (!best) return null
  return {
    id: `custom-${best.rule.id}`,
    templateId: best.rule.id,
    title: best.rule.title,
    summary: best.rule.summary,
    matchedKeywords: [...new Set(best.matchedKeywords)],
    document: documentFor(best.rule),
    notes: [...best.rule.notes],
  }
}

export function customItemIdeaTemplateIds(): readonly CustomItemIdeaTemplateId[] {
  return TEMPLATES.map((entry) => entry.id)
}
