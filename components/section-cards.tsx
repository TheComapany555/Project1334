"use client"

import Link from "next/link"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type SectionCardItem = {
  title: string
  value: string | number
  footer?: string
  href?: string
}

export function SectionCards({ cards }: { cards: SectionCardItem[] }) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((card) => {
        const inner = (
          <>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {card.value}
              </CardTitle>
            </CardHeader>
            {card.footer && (
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="text-muted-foreground">{card.footer}</div>
              </CardFooter>
            )}
          </>
        )

        return card.href ? (
          <Link key={card.title} href={card.href} className="no-underline">
            <Card className="@container/card transition-colors hover:border-primary/40 cursor-pointer h-full">
              {inner}
            </Card>
          </Link>
        ) : (
          <Card key={card.title} className="@container/card">
            {inner}
          </Card>
        )
      })}
    </div>
  )
}
