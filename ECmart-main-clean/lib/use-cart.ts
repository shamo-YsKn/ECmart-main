"use client"

import { useCallback, useMemo, useState } from "react"
import type { CartItem } from "./types"
import { getProduct, getShop } from "./data"

export interface ShopCartGroup {
  shopId: string
  shopName: string
  shopEmoji: string
  items: { item: CartItem; product: ReturnType<typeof getProduct> }[]
  subtotal: number
  count: number
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = useCallback((productId: string, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      if (existing) {
        return prev.map((i) =>
          i.productId === productId
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        )
      }
      return [...prev, { productId, quantity }]
    })
  }, [])

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    )
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }, [])

  const clearShop = useCallback((shopId: string) => {
    setItems((prev) =>
      prev.filter((i) => getProduct(i.productId)?.shopId !== shopId),
    )
  }, [])

  const totalCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  )

  const grandTotal = useMemo(
    () =>
      items.reduce((sum, i) => {
        const p = getProduct(i.productId)
        return sum + (p ? p.price * i.quantity : 0)
      }, 0),
    [items],
  )

  /** 店舗ごとにカートを分ける */
  const groups = useMemo<ShopCartGroup[]>(() => {
    const map = new Map<string, ShopCartGroup>()
    for (const item of items) {
      const product = getProduct(item.productId)
      if (!product) continue
      const shop = getShop(product.shopId)
      if (!shop) continue
      if (!map.has(shop.id)) {
        map.set(shop.id, {
          shopId: shop.id,
          shopName: shop.name,
          shopEmoji: shop.emoji,
          items: [],
          subtotal: 0,
          count: 0,
        })
      }
      const group = map.get(shop.id)!
      group.items.push({ item, product })
      group.subtotal += product.price * item.quantity
      group.count += item.quantity
    }
    return Array.from(map.values())
  }, [items])

  const quantityOf = useCallback(
    (productId: string) =>
      items.find((i) => i.productId === productId)?.quantity ?? 0,
    [items],
  )

  return {
    items,
    groups,
    totalCount,
    grandTotal,
    addItem,
    setQuantity,
    removeItem,
    clearShop,
    quantityOf,
  }
}

export type CartApi = ReturnType<typeof useCart>
