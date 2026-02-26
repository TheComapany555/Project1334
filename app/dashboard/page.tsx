import Link from "next/link"
import { getListingsByBroker } from "@/lib/actions/listings"
import type { ListingsChartDataPoint } from "@/components/dashboard/chart-line-listings"
import { ChartLineListings } from "@/components/dashboard/chart-line-listings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  FileText,
  FileCheck2,
  FileClock,
  FileX2,
  Plus,
  ArrowRight,
  Pencil,
} from "lucide-react"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function buildListingsChartData(listings: { created_at: string; status: string }[]): ListingsChartDataPoint[] {
  const now = new Date()
  const points: ListingsChartDataPoint[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const added = listings.filter((l) => {
      const created = new Date(l.created_at)
      return created >= d && created < nextMonth
    }).length
    const published = listings.filter((l) => {
      const created = new Date(l.created_at)
      return created >= d && created < nextMonth && l.status === "published"
    }).length
    const draft = listings.filter((l) => {
      const created = new Date(l.created_at)
      return created >= d && created < nextMonth && l.status === "draft"
    }).length
    const other = added - published - draft
    points.push({
      month: MONTH_NAMES[d.getMonth()],
      added,
      published,
      draft,
      other,
    })
  }
  return points
}

function statusBadge(status: string) {
  const s = status.replace("_", " ")
  switch (status) {
    case "published":
      return (
        <Badge className="bg-[#1a5c38]/10 text-[#1a5c38] dark:bg-[#4ade80]/10 dark:text-[#4ade80] border-0 text-xs font-medium capitalize">
          {s}
        </Badge>
      )
    case "draft":
      return (
        <Badge variant="secondary" className="text-xs font-medium capitalize">
          {s}
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-xs font-medium capitalize text-muted-foreground">
          {s}
        </Badge>
      )
  }
}

export default async function DashboardPage() {
  const listings = await getListingsByBroker()
  const total = listings.length
  const published = listings.filter((l) => l.status === "published").length
  const draft = listings.filter((l) => l.status === "draft").length
  const other = total - published - draft

  const cards = [
    {
      title: "Total listings",
      value: total,
      description: "All your business listings",
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 dark:bg-blue-400/10",
    },
    {
      title: "Published",
      value: published,
      description: "Live on the marketplace",
      icon: FileCheck2,
      color: "text-[#1a5c38] dark:text-[#4ade80]",
      bg: "bg-[#1a5c38]/10 dark:bg-[#4ade80]/10",
    },
    {
      title: "Draft",
      value: draft,
      description: "Not yet published",
      icon: FileClock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 dark:bg-amber-400/10",
    },
    {
      title: "Other",
      value: other,
      description: "Under offer, sold, or archived",
      icon: FileX2,
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
  ]

  const chartData = buildListingsChartData(listings)
  const recent = listings.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your listings, profile, and enquiries.
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="shrink-0 bg-[#1a5c38] hover:bg-[#144a2d] text-white shadow-sm"
        >
          <Link href="/dashboard/listings/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Add listing
          </Link>
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold tracking-tight">{card.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{card.description}</p>
                </div>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${card.bg}`}>
                  <card.icon className={`h-4.5 w-4.5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Chart ── */}
      <ChartLineListings
        data={chartData}
        footer={{
          description: "New listings added and status breakdown for the last 6 months",
        }}
      />

      {/* ── Recent listings ── */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/30 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Recent listings</CardTitle>
              <CardDescription className="mt-0.5">
                Your 5 most recently created listings.
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link href="/dashboard/listings" className="flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-4 text-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium">No listings yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create your first listing to get started.
                </p>
              </div>
              <Button
                asChild
                size="sm"
                className="mt-1 bg-[#1a5c38] hover:bg-[#144a2d] text-white"
              >
                <Link href="/dashboard/listings/new">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add your first listing
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {recent.map((listing) => (
                <li key={listing.id}>
                  <Link
                    href={`/dashboard/listings/${listing.id}/edit`}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground/60" />
                      </div>
                      <span className="text-sm font-medium truncate">{listing.title}</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      {statusBadge(listing.status)}
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}