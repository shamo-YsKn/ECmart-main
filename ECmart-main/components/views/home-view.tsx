"use client"

import type { CartApi } from "@/lib/use-cart"
import { products, shops, townEvents } from "@/lib/data"
import { ProductCard } from "@/components/product-card"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RobotCharacter } from "@/components/robot/robot-character"
import { ArrowRight, MapPin, Sparkles, Hammer } from "lucide-react"

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
              町とつながる、体験型マーケット
            </Badge>
            <h1 className="font-display text-4xl leading-tight font-black text-balance md:text-5xl">
              町のあたたかさを、
              <br />
              おうちまで。
            </h1>
            <p className="max-w-md leading-relaxed text-muted-foreground">
              こだわりのお店や職人さんの手仕事を、ゆっくり選んで。
              買い物のあとは、ロボット工房で自分だけの鉄の仲間づくりも楽しめます。
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="rounded-full" onClick={() => onNavigate("shops")}>
                お店をのぞく
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full"
                onClick={() => onNavigate("robot")}
              >
                <Hammer data-icon="inline-start" />
                ロボット工房へ
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="mx-auto aspect-square max-w-xs rounded-3xl bg-[radial-gradient(circle_at_50%_40%,var(--color-secondary),var(--color-muted))] p-6">
              <RobotCharacter
                config={{
                  base: "volta",
                  size: 70,
                  bodyColor: "#d1d1d1",
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
          { icon: MapPin, title: "町の名店が集合", text: "食品・工芸・花・雑貨まで、選りすぐりのお店が並びます。" },
          { icon: Sparkles, title: "顔が見える買い物", text: "つくり手の想いや町の物語ごと、あなたのもとへ。" },
          { icon: Hammer, title: "つくる体験も", text: "ロボット工房で、世界にひとつの鉄の仲間をデザイン。" },
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
            <h2 className="font-display text-2xl font-bold">この町のこと</h2>
            <p className="mt-1 text-sm text-muted-foreground">みどり町・こうば通り・やまて坂・えき前商店街</p>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            小さな川に沿って広がる、人の顔が見える町。
            朝はパン屋の薪窯から煙がのぼり、昼は喫茶店の珈琲が香り、
            夕方には工房から金づちの音が響きます。
            マチノワは、そんな町の日常をまるごと届けるマーケットです。
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <div>
              <div className="font-display text-2xl font-bold text-primary">{shops.length}</div>
              <div className="text-xs text-muted-foreground">出店するお店</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-primary">4</div>
              <div className="text-xs text-muted-foreground">町のエリア</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-primary">{townEvents.length}</div>
              <div className="text-xs text-muted-foreground">今後のイベント</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-bold">Upcoming Events</h2>
          <ol className="relative flex flex-col gap-4 border-l-2 border-dashed border-border pl-6">
            {townEvents.map((ev) => (
              <li key={ev.id} className="relative">
                <span className="absolute -left-[1.95rem] top-1 flex size-5 items-center justify-center rounded-full border-2 border-primary bg-background">
                  <span className="size-2 rounded-full bg-primary" />
                </span>
                <Card className="border-2">
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-bold text-primary">{ev.date}</span>
                      <span className="text-xs text-muted-foreground">（{ev.weekday}）</span>
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
            <p className="mt-1 text-sm text-muted-foreground">町のみんなに選ばれています</p>
          </div>
          <Button variant="ghost" className="rounded-full" onClick={() => onNavigate("ranking")}>
            ランキングを見る
            <ArrowRight data-icon="inline-end" />
          </Button>
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
