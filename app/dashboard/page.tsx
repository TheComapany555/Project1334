import Link from "next/link"
import { getListingsByBroker } from "@/lib/actions/listings"
import type { ListingsChartDataPoint } from "@/components/dashboard/chart-line-listings"
import { ChartLineListings } from "@/components/dashboard/chart-line-listings"
import { SectionCards } from "@/components/section-cards"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function buildListingsChartData(listings: { created_at: string; status: string }[]): ListingsChartDataPoint[] {
  const now = new Date()
  const points: ListingsChartDataPoint[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
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

export default async function DashboardPage() {
  const listings = await getListingsByBroker()
  const total = listings.length
  const published = listings.filter((l) => l.status === "published").length
  const draft = listings.filter((l) => l.status === "draft").length
  const other = total - published - draft

  const cards = [
    { title: "Total listings", value: total, footer: "All your business listings" },
    { title: "Published", value: published, footer: "Live on the marketplace" },
    { title: "Draft", value: draft, footer: "Not yet published" },
    { title: "Other", value: other, footer: "Under offer, sold, or unpublished" },
  ]

  const chartData = buildListingsChartData(listings)
  const recent = listings.slice(0, 5)

  return (
    <>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Overview</h1>
        <p className="text-muted-foreground">
          Your broker dashboard. Create and manage listings, update your profile, and view enquiries.
        </p>
      </div>
      <SectionCards cards={cards} />
      <ChartLineListings
        data={chartData}
        footer={{
          description: "New listings added and status breakdown for the last 6 months",
        }}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Recent listings</CardTitle>
            <CardDescription>Your latest listings. Edit or change status from the Listings page.</CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/listings">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No listings yet.{" "}
              <Link href="/dashboard/listings/new" className="font-medium text-primary hover:underline">
                Add your first listing
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {recent.map((listing) => (
                <li key={listing.id}>
                  <Link
                    href={`/dashboard/listings/${listing.id}/edit`}
                    className="flex items-center justify-between rounded-md border border-transparent px-3 py-2 text-sm transition-colors hover:bg-muted/50 hover:border-border"
                  >
                    <span className="font-medium truncate">{listing.title}</span>
                    <span className="text-muted-foreground capitalize">{listing.status.replace("_", " ")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
