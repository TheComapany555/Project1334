import Link from "next/link"
import { getSession } from "@/lib/auth-client"
import { getListingsByBroker } from "@/lib/actions/listings"
import { getEnquiriesByBroker } from "@/lib/actions/enquiries"
import { getMySubscription } from "@/lib/actions/subscriptions"
import { ChartBarListings } from "@/components/dashboard/chart-bar-listings"
import { ChartBarEnquiriesBroker } from "@/components/dashboard/chart-bar-enquiries-broker"
import { ChartDonut } from "@/components/admin/chart-donut"
import { SectionCards } from "@/components/section-cards"
import { buildListingsChartData, buildEnquiriesChartData } from "@/lib/chart-data"
import { CHART_COLORS } from "@/lib/chart-theme"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  FileText,
  Plus,
  ArrowRight,
  Pencil,
  CreditCard,
} from "lucide-react"

export default async function DashboardPage() {
  const session = await getSession()
  const isAgencyOwner = session?.user?.agencyRole === "owner"
  const agencyName = session?.user?.agencyName

  const [listings, enquiries, subscription] = await Promise.all([
    getListingsByBroker(),
    getEnquiriesByBroker(),
    isAgencyOwner ? getMySubscription() : Promise.resolve(null),
  ])

  const total = listings.length
  const published = listings.filter((l) => l.status === "published").length
  const draft = listings.filter((l) => l.status === "draft").length
  const other = total - published - draft

  const chartData = buildListingsChartData(listings)
  const enquiriesChartData = buildEnquiriesChartData(enquiries)
  const recent = listings.slice(0, 5)

  const enquiriesThisWeek = enquiries.filter((e) => {
    const diff = Date.now() - new Date(e.created_at).getTime()
    return diff < 7 * 24 * 60 * 60 * 1000
  }).length
  const enquiriesOlder = enquiries.length - enquiriesThisWeek

  const statCards = [
    { title: "Total listings", value: total, footer: "All your business listings" },
    { title: "Published", value: published, footer: "Live on the marketplace" },
    { title: "Drafts", value: draft, footer: "Not yet published" },
    { title: "Enquiries", value: enquiries.length, footer: `${enquiriesThisWeek} this week` },
  ]

  return (
    <>
      {/* Title bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">
            {isAgencyOwner ? `${agencyName ?? "Agency"} Overview` : "Overview"}
          </h1>
          {isAgencyOwner && subscription && (
            <Link href="/dashboard/subscribe">
              <Badge
                variant={
                  subscription.status === "active" || subscription.status === "trialing" ? "success"
                  : subscription.status === "past_due" ? "warning"
                  : "secondary"
                }
                className="gap-1 text-[10px] cursor-pointer hover:opacity-80 transition-opacity"
              >
                <CreditCard className="h-3 w-3" />
                {subscription.status === "active" ? "Subscribed"
                  : subscription.status === "past_due" ? "Past due"
                  : subscription.status === "pending" ? "Pending"
                  : subscription.status === "trialing" ? "Trial"
                  : subscription.status}
              </Badge>
            </Link>
          )}
          {isAgencyOwner && !subscription && (
            <Link href="/dashboard/subscribe">
              <Badge variant="destructive" className="gap-1 text-[10px] cursor-pointer hover:opacity-80 transition-opacity">
                <CreditCard className="h-3 w-3" />
                No subscription
              </Badge>
            </Link>
          )}
        </div>
        <Button asChild size="sm" className="shrink-0 w-full sm:w-auto">
          <Link href="/dashboard/listings/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Add listing
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <SectionCards cards={statCards} />

      {/* Donut charts */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ChartDonut
          title="Listing status"
          segments={[
            { name: "Published", value: published, color: CHART_COLORS.primary },
            { name: "Draft", value: draft, color: CHART_COLORS.warning },
            { name: "Other", value: other, color: CHART_COLORS.purple },
          ]}
        />
        <ChartDonut
          title="Enquiries"
          segments={[
            { name: "This week", value: enquiriesThisWeek, color: CHART_COLORS.info },
            { name: "Older", value: enquiriesOlder, color: CHART_COLORS.purple },
          ]}
        />
      </div>

      {/* Time-series charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartBarListings
          data={chartData}
          footer={{ description: "Listing status breakdown over the last 6 months" }}
        />
        <ChartBarEnquiriesBroker
          data={enquiriesChartData}
          footer={{ description: "Enquiries received per month" }}
        />
      </div>

      {/* Recent listings */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="border-b border-border bg-muted/40 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Recent listings</CardTitle>
                <CardDescription className="mt-0.5">Your 5 most recently created listings.</CardDescription>
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
                <p className="text-sm font-medium">No listings yet</p>
                <p className="text-xs text-muted-foreground">Create your first listing to get started.</p>
                <Button asChild size="sm">
                  <Link href="/dashboard/listings/new">
                    <Plus className="h-4 w-4 mr-1.5" /> Add your first listing
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
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
                        <StatusBadge status={listing.status} className="text-xs font-medium capitalize border-0" />
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
    </>
  )
}
