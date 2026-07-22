"use client"

import { useMemo, useState } from "react"
import type { CartApi } from "@/lib/use-cart"
import type { Product, ShopCategory } from "@/lib/types"
import { formatYen, getShop, products, shops } from "@/lib/data"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QuantityStepper } from "@/components/product-card"
import { FavoriteButton } from "@/components/favorite-button"
import {
  CalendarDays,
  Info,
  Package,
  Plus,
  Star,
  Store,
  TrendingUp,
  Trophy,
} from "lucide-react"
import { cn } from "@/lib/utils"

const RANKING_TYPES = [
  {
    key: "shops",
    label: "お店ランキング",
    shortLabel: "お店",
    icon: Store,
    description: "直近30日間の販売個数を、お店ごとに合計したランキングです。",
  },
  {
    key: "monthly",
    label: "月間売れ筋",
    shortLabel: "月間売れ筋",
    icon: CalendarDays,
    description: "直近30日間によく選ばれた商品を紹介します。",
  },
  {
    key: "allTime",
    label: "累計人気",
    shortLabel: "累計人気",
    icon: Trophy,
    description: "これまでの累計販売個数が多い商品を紹介します。",
  },
] as const

type RankingType = (typeof RANKING_TYPES)[number]["key"]
type CategoryFilter = "all" | ShopCategory

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "食品", label: "食品" },
  { key: "工芸", label: "工芸" },
  { key: "雑貨", label: "雑貨" },
  { key: "花・緑", label: "花・緑" },
  { key: "喫茶", label: "喫茶" },
]

const MEDALS = ["#e8842f", "#aeb4bb", "#c9955b"]

function RankNumber({ rank }: { rank: number }) {
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full font-display text-lg font-black",
        rank <= 3 ? "text-white shadow-sm" : "bg-muted text-muted-foreground",
      )}
      style={rank <= 3 ? { backgroundColor: MEDALS[rank - 1] } : undefined}
      aria-label={`${rank}位`}
    >
      {rank}
    </div>
  )
}

function ProductRankingCard({
  product,
  rank,
  rankingType,
  cart,
}: {
  product: Product
  rank: number
  rankingType: "monthly" | "allTime"
  cart: CartApi
}) {
  const shop = getShop(product.shopId)
  const quantity = cart.quantityOf(product.id)
  const sales = rankingType === "monthly" ? product.last30DaysSold : product.soldCount
  const salesLabel = rankingType === "monthly" ? "直近30日" : "累計"

  return (
    <Card className="overflow-hidden border-2 transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
        <RankNumber rank={rank} />

        <div
          className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl sm:size-16"
          style={{ backgroundColor: `${shop?.color ?? "#888888"}1a` }}
        >
          {product.emoji}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-xs text-muted-foreground">
            {shop?.emoji} {shop?.name}
          </span>
          <h3 className="font-display truncate font-bold">{product.name}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-bold">{formatYen(product.price)}</span>
            <Badge variant="secondary" className="rounded-full text-xs">
              {salesLabel} {sales.toLocaleString("ja-JP")}個
            </Badge>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <FavoriteButton productId={product.id} />
          {quantity > 0 ? (
            <QuantityStepper
              quantity={quantity}
              onChange={(nextQuantity) => cart.setQuantity(product.id, nextQuantity)}
            />
          ) : (
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => cart.addItem(product.id)}
            >
              <Plus data-icon="inline-start" />
              <span className="hidden sm:inline">カゴに入れる</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function RankingView({ cart }: { cart: CartApi }) {
  const [rankingType, setRankingType] = useState<RankingType>("shops")
  const [category, setCategory] = useState<CategoryFilter>("all")

  const activeRanking =
    RANKING_TYPES.find((ranking) => ranking.key === rankingType) ?? RANKING_TYPES[0]
  const ActiveRankingIcon = activeRanking.icon

  const rankedProducts = useMemo(() => {
    if (rankingType === "shops") return []

    return products
      .filter((product) => {
        if (category === "all") return true
        return getShop(product.shopId)?.category === category
      })
      .slice()
      .sort((a, b) => {
        if (rankingType === "monthly") {
          return b.last30DaysSold - a.last30DaysSold
        }
        return b.soldCount - a.soldCount
      })
      .slice(0, 10)
  }, [category, rankingType])

  const rankedShops = useMemo(() => {
    return shops
      .filter((shop) => category === "all" || shop.category === category)
      .map((shop) => {
        const shopProducts = products.filter((product) => product.shopId === shop.id)
        const monthlySales = shopProducts.reduce(
          (total, product) => total + product.last30DaysSold,
          0,
        )
        const totalSales = shopProducts.reduce(
          (total, product) => total + product.soldCount,
          0,
        )
        const mostPopularProduct = shopProducts
          .slice()
          .sort((a, b) => b.last30DaysSold - a.last30DaysSold)[0]

        return {
          shop,
          monthlySales,
          totalSales,
          mostPopularProduct,
          productCount: shopProducts.length,
        }
      })
      .sort((a, b) => b.monthlySales - a.monthlySales)
  }, [category])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display flex items-center gap-2 text-3xl font-black">
          <TrendingUp className="size-7 text-primary" />
          ランキング
        </h1>
        <p className="text-muted-foreground">
          町でいま人気のお店や商品を、いろいろな切り口でチェック。
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {RANKING_TYPES.map((ranking) => {
          const Icon = ranking.icon
          const selected = rankingType === ranking.key
          return (
            <button
              key={ranking.key}
              type="button"
              onClick={() => setRankingType(ranking.key)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-card hover:border-primary/40",
              )}
              aria-pressed={selected}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  selected ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="font-display block font-bold">{ranking.shortLabel}</span>
                <span className="hidden text-xs text-muted-foreground lg:block">
                  {ranking.key === "shops"
                    ? "直近30日の店舗別"
                    : ranking.key === "monthly"
                      ? "直近30日の商品別"
                      : "これまでの商品別"}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <Card className="border-2 bg-muted/35">
        <CardContent className="flex items-start gap-3 p-4">
          <ActiveRankingIcon className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-display font-bold">{activeRanking.label}</h2>
            <p className="text-sm text-muted-foreground">{activeRanking.description}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold">カテゴリーで絞り込む</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={category === item.key ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setCategory(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-dashed bg-background px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          現在の「直近30日」の数字は画面確認用のサンプルです。注文データベースと接続すると、実際の購入日時と数量から自動集計できます。
        </p>
      </div>

      {rankingType === "shops" ? (
        <div className="flex flex-col gap-3">
          {rankedShops.map((entry, index) => (
            <Card
              key={entry.shop.id}
              className="overflow-hidden border-2 transition-shadow hover:shadow-md"
            >
              <CardContent className="grid gap-4 p-4 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:items-center">
                <RankNumber rank={index + 1} />

                <div
                  className="flex size-16 items-center justify-center rounded-2xl text-4xl"
                  style={{ backgroundColor: `${entry.shop.color}1a` }}
                >
                  {entry.shop.emoji}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display truncate text-lg font-black">
                      {entry.shop.name}
                    </h3>
                    <Badge variant="outline" className="rounded-full">
                      {entry.shop.category}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {entry.shop.tagline}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="size-3.5 fill-current text-amber-500" />
                      評価 {entry.shop.rating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="size-3.5" />
                      商品 {entry.productCount}点
                    </span>
                    {entry.mostPopularProduct && (
                      <span className="truncate">
                        今月人気：{entry.mostPopularProduct.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-primary/5 px-4 py-3 text-left sm:min-w-36 sm:text-right">
                  <div className="text-xs text-muted-foreground">直近30日</div>
                  <div className="font-display text-2xl font-black text-primary">
                    {entry.monthlySales.toLocaleString("ja-JP")}
                    <span className="ml-1 text-sm">個</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    累計 {entry.totalSales.toLocaleString("ja-JP")}個
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rankedProducts.map((product, index) => (
            <ProductRankingCard
              key={product.id}
              product={product}
              rank={index + 1}
              rankingType={rankingType}
              cart={cart}
            />
          ))}
        </div>
      )}

      {(rankingType === "shops" ? rankedShops.length : rankedProducts.length) === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            このカテゴリーには、まだランキング対象がありません。
          </CardContent>
        </Card>
      )}
    </div>
  )
}
