"use client"

import { useState } from "react"
import type { CartApi } from "@/lib/use-cart"
import type { PurchaseResult } from "@/lib/types"
import { formatYen } from "@/lib/data"
import { calculateRewardPoints, SHIPPING_PER_SHOP } from "@/lib/purchase"
import { useAccount } from "@/lib/account-context"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { QuantityStepper } from "@/components/product-card"
import {
  CheckCircle2,
  Coins,
  LoaderCircle,
  PartyPopper,
  ReceiptText,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

function createCheckoutId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    const value = character === "x" ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

export function CartView({
  cart,
  onNavigate,
}: {
  cart: CartApi
  onNavigate: (tab: string) => void
}) {
  const account = useAccount()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [checkoutId, setCheckoutId] = useState("")
  const [completedPurchase, setCompletedPurchase] = useState<PurchaseResult | null>(null)

  if (completedPurchase) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 py-12 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PartyPopper className="size-10" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-black">購入が完了しました！</h1>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            町のお店から、心をこめてお届けします。
          </p>
        </div>

        <Card className="w-full border-2 text-left">
          <CardContent className="flex flex-col gap-3 p-5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">注文番号</span>
              <span className="font-mono font-bold">{completedPurchase.orderId.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">お支払い金額</span>
              <span className="font-display font-black">{formatYen(completedPurchase.totalAmount)}</span>
            </div>
            <Separator />
            <div className="rounded-2xl bg-primary/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2 font-bold text-primary">
                <Coins className="size-5" />
                獲得ポイント
              </div>
              <div className="font-display mt-1 text-3xl font-black text-primary">
                +{completedPurchase.pointsAwarded.toLocaleString()} pt
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                現在の保有ポイント：{completedPurchase.pointsBalance.toLocaleString()} pt
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid w-full grid-cols-2 gap-3">
          <Button variant="outline" className="rounded-full" onClick={() => onNavigate("account")}>
            <Coins data-icon="inline-start" />
            ポイントを見る
          </Button>
          <Button className="rounded-full" onClick={() => onNavigate("home")}>
            ホームへもどる
          </Button>
        </div>
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
        <a
          href="?tab=shops"
          className={cn(buttonVariants(), "rounded-full")}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            onNavigate("shops")
          }}
        >
          お店をのぞく
        </a>
      </div>
    )
  }

  const shippingTotal = cart.groups.length * SHIPPING_PER_SHOP
  const grand = cart.grandTotal + shippingTotal
  const points = calculateRewardPoints(grand)

  function openConfirmation() {
    setPurchaseError(null)
    if (!account.user) {
      onNavigate("account")
      return
    }
    setCheckoutId(createCheckoutId())
    setConfirmOpen(true)
  }

  async function completePurchase() {
    if (submitting) return
    setSubmitting(true)
    setPurchaseError(null)
    const result = await account.purchaseCart(cart.items, checkoutId || createCheckoutId())
    setSubmitting(false)

    if (result.error || !result.purchase) {
      setPurchaseError(result.error || "購入処理を完了できませんでした。")
      return
    }

    setConfirmOpen(false)
    cart.clearCart()
    setCompletedPurchase(result.purchase)
  }

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

      {purchaseError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {purchaseError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
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
                        <span className="text-sm text-muted-foreground">{formatYen(product.price)}</span>
                      </div>
                      <QuantityStepper
                        quantity={item.quantity}
                        onChange={(quantity) => cart.setQuantity(product.id, quantity)}
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
                <span className="text-muted-foreground">送料 {formatYen(SHIPPING_PER_SHOP)}</span>
                <span className="font-display font-bold">小計 {formatYen(group.subtotal)}</span>
              </CardFooter>
            </Card>
          ))}
        </div>

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
                <Coins data-icon="inline-start" />
                購入で +{points.toLocaleString()} pt
              </Badge>
              <p className="text-xs leading-relaxed text-muted-foreground">
                100円ごとに200ptを付与します。ポイントは購入完了後、アカウントへ反映されます。
              </p>
            </CardContent>
            <CardFooter>
              <Button size="lg" className="w-full rounded-full" onClick={openConfirmation}>
                <ReceiptText data-icon="inline-start" />
                {account.user ? "購入する" : "ログインして購入"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(open) => !submitting && setConfirmOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-black">注文内容を確認してください</DialogTitle>
            <DialogDescription>
              「購入を確定する」を押すと注文が完了し、ポイントがアカウントへ付与されます。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {cart.groups.flatMap((group) =>
              group.items.map(({ item, product }) =>
                product ? (
                  <div key={product.id} className="flex items-center justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-bold">{product.emoji} {product.name}</div>
                      <div className="text-xs text-muted-foreground">{item.quantity}点</div>
                    </div>
                    <span className="shrink-0 font-bold">{formatYen(product.price * item.quantity)}</span>
                  </div>
                ) : null,
              ),
            )}
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">商品合計</span>
              <span>{formatYen(cart.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">送料</span>
              <span>{formatYen(shippingTotal)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-bold">合計</span>
              <span className="font-display text-2xl font-black text-primary">{formatYen(grand)}</span>
            </div>
            <div className="rounded-xl bg-primary/10 p-3 text-center font-bold text-primary">
              <Coins className="mr-1 inline size-5" />
              獲得予定 {points.toLocaleString()} pt
            </div>
            {purchaseError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {purchaseError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              カートへ戻る
            </Button>
            <Button onClick={() => void completePurchase()} disabled={submitting}>
              {submitting ? (
                <LoaderCircle className="animate-spin" data-icon="inline-start" />
              ) : (
                <CheckCircle2 data-icon="inline-start" />
              )}
              購入を確定する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
