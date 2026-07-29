import { getProduct } from "@/lib/data"
import type { CartItem } from "@/lib/types"

export const SHIPPING_PER_SHOP = 350
export const POINTS_PER_100_YEN = 200

export function calculateRewardPoints(totalAmount: number) {
  return Math.floor(Math.max(0, totalAmount) / 100) * POINTS_PER_100_YEN
}

export function calculateCartTotals(items: CartItem[]) {
  const validItems = items
    .map((item) => {
      const product = getProduct(item.productId)
      const quantity = Math.max(0, Math.min(99, Math.floor(Number(item.quantity) || 0)))
      return product && quantity > 0 ? { product, quantity } : null
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

  const productTotal = validItems.reduce(
    (sum, entry) => sum + entry.product.price * entry.quantity,
    0,
  )
  const shopCount = new Set(validItems.map((entry) => entry.product.shopId)).size
  const shippingTotal = shopCount * SHIPPING_PER_SHOP
  const totalAmount = productTotal + shippingTotal
  const pointsAwarded = calculateRewardPoints(totalAmount)

  return {
    validItems,
    productTotal,
    shippingTotal,
    totalAmount,
    pointsAwarded,
    shopCount,
  }
}
