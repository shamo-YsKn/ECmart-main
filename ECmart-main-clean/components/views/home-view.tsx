"use client"

import type { CartApi } from "@/lib/use-cart"
import { products, shops, townEvents } from "@/lib/data"
import { ProductCard } from "@/components/product-card"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RobotCharacter } from "@/components/robot/robot-character"
import { ArrowRight, MapPin, Sparkles, Hammer } from "lucide-react"
import { cn } from "@/lib/utils"

export function HomeView({
  cart,
  onNavigate,
}: {
  cart: CartApi
  onNavigate: (tab: string) => void
}) {
  const featured = products.filter((p) => p.tags.includes("人気")).slice(0, 3)

  return (
    <div className="flex flex-col gap-16">
      {/* ヒーロー */}
      <section className="relative overflow-hidden rounded-3xl border-2 bg-card">
        <div className="grid items-center gap-6 p-8 md:grid-cols-2 md:p-12">
          <div className="flex flex-col items-start gap-5">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              <MapPin data-icon="inline-start" />
              北の大地・室蘭のセレクトマーケット
            </Badge>
            <h1 className="font-display text-4xl leading-tight font-black text-balance md:text-5xl">
              鉄のまちの、おいしさと
              <br />
              手仕事を。
            </h1>
            <p className="max-w-md leading-relaxed text-muted-foreground">
              室蘭やきとり、うずらプリン、カレーラーメン、そして鉄の仲間ボルタ。
              海と工場のまち・室蘭らしい品と体験を、ひとつのマーケットに集めました。
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="?tab=shops"
                className={cn(buttonVariants({ size: "lg" }), "rounded-full")}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                  event.preventDefault()
                  onNavigate("shops")
                }}
              >
                お店をのぞく
                <ArrowRight data-icon="inline-end" />
              </a>
              <a
                href="?tab=robot"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full")}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                  event.preventDefault()
                  onNavigate("robot")
                }}
              >
                <Hammer data-icon="inline-start" />
                ロボット工房へ
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="mx-auto aspect-square max-w-xs rounded-3xl bg-[radial-gradient(circle_at_50%_40%,var(--color-secondary),var(--color-muted))] p-6">
              <RobotCharacter
                config={{
                  base: "volta",
                  size: 70,
                  bodyColor: "#c9a24b",
                  accentColor: "#111111",
                  pose: "cheer",
                  item: "none",
                  view: "front",
                  name: "ボルタ",
                }}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 特徴 */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: MapPin, title: "室蘭の名店が集合", text: "高砂町・中島町・石川町・中央町から、室蘭らしい店と品を集めました。" },
          { icon: Sparkles, title: "二大ソウルフード", text: "室蘭やきとりと室蘭カレーラーメン。店ごとの味わいも楽しめます。" },
          { icon: Hammer, title: "鉄のまちの手仕事", text: "ボルタとナッティを、自分だけの色やアイテムでデザインできます。" },
        ].map((f) => (
          <Card key={f.title} className="border-2">
            <CardContent className="flex flex-col gap-2 p-6">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-display font-bold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* 町紹介 & イベント */}
      <section className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">室蘭のこと</h2>
            <p className="mt-1 text-sm text-muted-foreground">高砂町・石川町・中島町・中央町・こうば通り</p>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            太平洋に面し、白鳥大橋と工場群の夜景、地球岬の大パノラマを楽しめる室蘭。
            鉄のまちを支えてきた食文化から生まれた室蘭やきとりやカレーラーメン、
            地元の素材を生かしたスイーツと手仕事を、マチノワ室蘭から紹介します。
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <div>
              <div className="font-display text-2xl font-bold text-primary">{shops.length}</div>
              <div className="text-xs text-muted-foreground">出店するお店</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-primary">{new Set(shops.map((shop) => shop.town)).size}</div>
              <div className="text-xs text-muted-foreground">室蘭のエリア</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-primary">{townEvents.length}</div>
              <div className="text-xs text-muted-foreground">室蘭の見どころ</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-bold">室蘭の見どころ</h2>
          <ol className="relative flex flex-col gap-4 border-l-2 border-dashed border-border pl-6">
            {townEvents.map((ev) => (
              <li key={ev.id} className="relative">
                <span className="absolute -left-[1.95rem] top-1 flex size-5 items-center justify-center rounded-full border-2 border-primary bg-background">
                  <span className="size-2 rounded-full bg-primary" />
                </span>
                <Card className="border-2">
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full">{ev.date}</Badge>
                      <Badge variant="secondary" className="rounded-full">{ev.tag}</Badge>
                    </div>
                    <h3 className="font-display font-bold text-pretty">{ev.title}</h3>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {ev.location}
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{ev.description}</p>
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex w-fit items-center gap-1 text-sm font-bold text-primary hover:underline"
                    >
                      くわしく見る
                      <ArrowRight className="size-4" />
                    </a>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 人気商品 */}
      <section className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">いま人気の品</h2>
            <p className="mt-1 text-sm text-muted-foreground">室蘭の名物から、いま注目の品を紹介します</p>
          </div>
          <a
            href="?tab=ranking"
            className={cn(buttonVariants({ variant: "ghost" }), "rounded-full")}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              onNavigate("ranking")
            }}
          >
            ランキングを見る
            <ArrowRight data-icon="inline-end" />
          </a>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} cart={cart} />
          ))}
        </div>
      </section>
    </div>
  )
}
