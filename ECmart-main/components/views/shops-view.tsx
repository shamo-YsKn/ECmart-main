"use client"

import { useMemo, useState } from "react"
import type { CartApi } from "@/lib/use-cart"
import type { Shop, ShopCategory } from "@/lib/types"
import { products, shops } from "@/lib/data"
import { ProductCard } from "@/components/product-card"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Star, MapPin, Store } from "lucide-react"
import { cn } from "@/lib/utils"

const CATEGORIES: (ShopCategory | "すべて")[] = [
  "すべて",
  "食品",
  "工芸",
  "花・緑",
  "喫茶",
  "雑貨",
]

export function ShopsView({ cart }: { cart: CartApi }) {
  const [category, setCategory] = useState<ShopCategory | "すべて">("すべて")
  const [openShop, setOpenShop] = useState<Shop | null>(null)

  const filtered = useMemo(
    () => (category === "すべて" ? shops : shops.filter((s) => s.category === category)),
    [category],
  )

  const shopProducts = openShop
    ? products.filter((p) => p.shopId === openShop.id)
    : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-black">ショップ一覧</h1>
        <p className="text-muted-foreground">町のお店をのぞいて、お気に入りを見つけましょう。</p>
      </div>

      {/* カテゴリ絞り込み */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={category === c ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setCategory(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      {/* 店舗カード */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((shop) => {
          const count = products.filter((p) => p.shopId === shop.id).length
          return (
            <Card key={shop.id} className="flex flex-col gap-0 overflow-hidden border-2 py-0">
              <div
                className="flex h-28 items-center justify-between px-6"
                style={{ backgroundColor: `${shop.color}26` }}
              >
                <div className="flex flex-col gap-1">
                  <Badge variant="secondary" className="w-fit rounded-full">{shop.category}</Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {shop.town}
                  </span>
                </div>
                <span className="text-5xl">{shop.emoji}</span>
              </div>
              <CardContent className="flex flex-1 flex-col gap-2 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-bold">{shop.name}</h3>
                  <span className="flex items-center gap-1 text-sm font-bold">
                    <Star className="size-4 fill-primary text-primary" />
                    {shop.rating}
                  </span>
                </div>
                <p className="text-sm font-medium text-primary">{shop.tagline}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{shop.description}</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="text-xs text-muted-foreground">
                    店主：{shop.owner}・{count}品
                  </span>
                  <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setOpenShop(shop)}>
                    <Store data-icon="inline-start" />
                    お店を見る
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!openShop} onOpenChange={(o) => !o && setOpenShop(null)}>
        <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
          {openShop && (
            <>
              <DialogHeader
                className="gap-2 p-6 text-left"
                style={{ backgroundColor: `${openShop.color}26` }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{openShop.emoji}</span>
                  <div className="flex flex-col gap-1">
                    <DialogTitle className="font-display text-xl">{openShop.name}</DialogTitle>
                    <DialogDescription className="text-foreground/70">
                      {openShop.tagline}
                    </DialogDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="rounded-full">{openShop.category}</Badge>
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {openShop.town}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className={cn("size-3.5 fill-primary text-primary")} />
                        {openShop.rating}
                      </span>
                      <span>創業 {openShop.established}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{openShop.description}</p>
              </DialogHeader>
              <div className="max-h-[50vh] overflow-y-auto p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {shopProducts.map((p) => (
                    <ProductCard key={p.id} product={p} cart={cart} />
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
