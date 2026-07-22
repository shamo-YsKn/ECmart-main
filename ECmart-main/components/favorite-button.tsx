"use client"

import { useState } from "react"
import { Heart, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAccount } from "@/lib/account-context"
import { cn } from "@/lib/utils"

function openAccountPage() {
  window.dispatchEvent(
    new CustomEvent("machinowa:navigate", { detail: { tab: "account" } }),
  )
}

export function FavoriteButton({
  productId,
  className,
}: {
  productId: string
  className?: string
}) {
  const { configured, user, favoriteProductIds, toggleFavorite } = useAccount()
  const [pending, setPending] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const isFavorite = favoriteProductIds.has(productId)

  async function handleClick() {
    setLocalError(null)

    if (!configured || !user) {
      openAccountPage()
      return
    }

    setPending(true)
    const result = await toggleFavorite(productId)
    setPending(false)
    if (result.error) {
      setLocalError(result.error)
      window.alert(`お気に入りを更新できませんでした。\n${result.error}`)
    }
  }

  return (
    <>
      <Button
        type="button"
        size="icon-sm"
        variant="secondary"
        className={cn(
          "rounded-full border bg-background/90 shadow-sm backdrop-blur hover:bg-background",
          isFavorite && "text-rose-600",
          className,
        )}
        onClick={handleClick}
        disabled={pending}
        aria-label={isFavorite ? "お気に入りから外す" : "お気に入りに追加"}
        aria-pressed={isFavorite}
        title={user ? (isFavorite ? "お気に入りから外す" : "お気に入りに追加") : "ログインしてお気に入りに追加"}
      >
        {pending ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Heart className={cn(isFavorite && "fill-current")} />
        )}
      </Button>
      {localError && <span className="sr-only">{localError}</span>}
    </>
  )
}
