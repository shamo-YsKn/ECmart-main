"use client"

import { useState } from "react"
import type { CartApi } from "@/lib/use-cart"
import { formatYen } from "@/lib/data"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { QuantityStepper } from "@/components/product-card"
import { ShoppingBag, Trash2, X, PartyPopper } from "lucide-react"

const SHIPPING_PER_SHOP = 350

export function CartView({
  cart,
  onNavigate,
}: {
  cart: CartApi
  onNavigate: (tab: string) => void
}) {
  const [ordered, setOrdered] = useState(false)

  if (ordered) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PartyPopper className="size-10" />
        </div>
        <h1 className="font-display text-2xl font-black">ご注文ありがとうございます！</h1>
        <p className="leading-relaxed text-muted-foreground">
          町のお店から、心をこめてお届けします。
          発送のお知らせはメールでご案内します。
        </p>
        <Button className="rounded-full" onClick={() => onNavigate("home")}>
          ホームへもどる
        </Button>
      </div>
    )
  }

  if (cart.groups.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ShoppingBag className="size-9" />
        </div>
        <h1 className="font-display text-2xl font-black">カゴは空っぽです</h1>
        <p className="text-muted-foreground">気になる品をカゴに入れてみましょう。</p>
        <Button className="rounded-full" onClick={() => onNavigate("shops")}>
          お店をのぞく
        </Button>
      </div>
    )
  }

  const shippingTotal = cart.groups.length * SHIPPING_PER_SHOP
  const grand = cart.grandTotal + shippingTotal

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display flex items-center gap-2 text-3xl font-black">
          <ShoppingBag className="size-7 text-primary" />
          カート
        </h1>
        <p className="text-muted-foreground">
          お店ごとにまとめてお届けします（{cart.groups.length}店舗）。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* 店舗ごとのカゴ */}
        <div className="flex flex-col gap-5">
          {cart.groups.map((group) => (
            <Card key={group.shopId} className="border-2">
              <CardHeader className="flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{group.shopEmoji}</span>
                  <div>
                    <h2 className="font-display font-bold">{group.shopName}</h2>
                    <span className="text-xs text-muted-foreground">{group.count}点</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-muted-foreground"
                  onClick={() => cart.clearShop(group.shopId)}
                >
                  <Trash2 data-icon="inline-start" />
                  空にする
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {group.items.map(({ item, product }) =>
                  product ? (
                    <div key={product.id} className="flex items-center gap-3">
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl">
                        {product.emoji}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="font-display truncate font-bold">{product.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatYen(product.price)}
                        </span>
                      </div>
                      <QuantityStepper
                        quantity={item.quantity}
                        onChange={(q) => cart.setQuantity(product.id, q)}
                      />
                      <span className="hidden w-20 text-right font-display font-bold tabular-nums sm:block">
                        {formatYen(product.price * item.quantity)}
                      </span>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="削除"
                        className="rounded-full text-muted-foreground"
                        onClick={() => cart.removeItem(product.id)}
                      >
                        <X />
                      </Button>
                    </div>
                  ) : null,
                )}
              </CardContent>
              <CardFooter className="justify-between border-t pt-4 text-sm">
                <span className="text-muted-foreground">
                  送料 {formatYen(SHIPPING_PER_SHOP)}
                </span>
                <span className="font-display font-bold">
                  小計 {formatYen(group.subtotal)}
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* 合計 */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="border-2">
            <CardHeader>
              <h2 className="font-display text-lg font-bold">お支払い金額</h2>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">商品合計（{cart.totalCount}点）</span>
                <span className="tabular-nums">{formatYen(cart.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">送料（{cart.groups.length}店舗）</span>
                <span className="tabular-nums">{formatYen(shippingTotal)}</span>
              </div>
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="font-bold">合計</span>
                <span className="font-display text-2xl font-black text-primary tabular-nums">
                  {formatYen(grand)}
                </span>
              </div>
              <Badge variant="secondary" className="w-fit rounded-full">
                町の応援ポイント +{Math.floor(grand / 100)}pt
              </Badge>
            </CardContent>
            <CardFooter>
              <Button size="lg" className="w-full rounded-full" onClick={() => setOrdered(true)}>
                レジへすすむ
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
