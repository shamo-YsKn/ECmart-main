"use client"

import type { Product } from "@/lib/types"
import type { CartApi } from "@/lib/use-cart"
import { formatYen, getShop } from "@/lib/data"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Minus, Plus } from "lucide-react"
import { FavoriteButton } from "@/components/favorite-button"

export function QuantityStepper({
  quantity,
  onChange,
}: {
  quantity: number
  onChange: (q: number) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-input bg-background p-1">
      <Button
        size="icon-sm"
        variant="ghost"
        className="size-7 rounded-full"
        aria-label="ひとつ減らす"
        onClick={() => onChange(quantity - 1)}
      >
        <Minus />
      </Button>
      <span className="min-w-8 text-center text-sm font-bold tabular-nums">
        {quantity}
      </span>
      <Button
        size="icon-sm"
        variant="ghost"
        className="size-7 rounded-full"
        aria-label="ひとつ増やす"
        onClick={() => onChange(quantity + 1)}
      >
        <Plus />
      </Button>
    </div>
  )
}

export function ProductCard({
  product,
  cart,
}: {
  product: Product
  cart: CartApi
}) {
  const shop = getShop(product.shopId)
  const qty = cart.quantityOf(product.id)

  return (
    <Card className="group flex flex-col gap-0 overflow-hidden border-2 py-0 transition-shadow hover:shadow-lg">
      <div
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden"
        style={{ backgroundColor: `${shop?.color}1a` }}
      >
        <span className="text-6xl transition-transform duration-300 group-hover:scale-110">
          {product.emoji}
        </span>
        {product.tags.includes("人気") && (
          <Badge className="absolute left-3 top-3 rounded-full bg-primary">
            人気
          </Badge>
        )}
        <FavoriteButton
          productId={product.id}
          className="absolute right-3 top-3"
        />
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{shop?.emoji}</span>
          <span className="truncate">{shop?.name}</span>
        </div>
        <h3 className="font-display leading-snug font-bold text-pretty">
          {product.name}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {product.description}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {product.tags.map((t) => (
            <Badge key={t} variant="secondary" className="rounded-full text-xs">
              {t}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 border-t bg-muted/40 p-4">
        <div className="font-display text-lg font-bold text-foreground">
          {formatYen(product.price)}
        </div>
        {qty > 0 ? (
          <QuantityStepper
            quantity={qty}
            onChange={(q) => cart.setQuantity(product.id, q)}
          />
        ) : (
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => cart.addItem(product.id)}
          >
            <Plus data-icon="inline-start" />
            カゴに入れる
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
