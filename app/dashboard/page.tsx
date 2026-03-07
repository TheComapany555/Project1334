import Link from "next/link"
import { getSession } from "@/lib/auth-client"
import { getListingsByBroker } from "@/lib/actions/listings"
import { getEnquiriesByBroker } from "@/lib/actions/enquiries"
import { ChartBarListings } from "@/components/dashboard/chart-bar-listings"
import { ChartBarEnquiriesBroker } from "@/components/dashboard/chart-bar-enquiries-broker"
import { ChartDonut } from "@/components/admin/chart-donut"
import { buildListingsChartData, buildEnquiriesChartData } from "@/lib/chart-data"
import { CHART_COLORS } from "@/lib/chart-theme"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  FileText,
  FileCheck2,
  FileClock,
  FileX2,
  Plus,
  ArrowRight,
  Pencil,
} from "lucide-react"

export default async function DashboardPage() {
  const session = await getSession()
  const isAgencyOwner = session?.user?.agencyRole === "owner"
  const agencyName = session?.user?.agencyName

  const [listings, enquiries] = await Promise.all([
    getListingsByBroker(),
    getEnquiriesByBroker(),
  ])
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
      color: "text-success",
      bg: "bg-success/15 dark:bg-success/20",
    },
    {
      title: "Draft",
      value: draft,
      description: "Not yet published",
      icon: FileClock,
      color: "text-[var(--warning-foreground)]",
      bg: "bg-warning/15 dark:bg-warning/20",
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
  const enquiriesChartData = buildEnquiriesChartData(enquiries)
  const recent = listings.slice(0, 5)

  const enquiriesThisWeek = enquiries.filter((e) => {
    const diff = Date.now() - new Date(e.created_at).getTime()
    return diff < 7 * 24 * 60 * 60 * 1000
  }).length
  const enquiriesOlder = enquiries.length - enquiriesThisWeek

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAgencyOwner ? `${agencyName ?? "Agency"} Overview` : "Overview"}
        description={isAgencyOwner
          ? "Agency-wide overview of listings, enquiries, and team activity."
          : "Manage your listings, profile, and enquiries."
        }
        action={
          <Button asChild size="sm" className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            <Link href="/dashboard/listings/new">
              <Plus className="h-4 w-4 mr-1.5" />
              Add listing
            </Link>
          </Button>
        }
      />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
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

      {/* ── Pie charts ── */}
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

      {/* ── Time-series charts ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartBarListings
          data={chartData}
          footer={{
            description: "Listings status breakdown — last 6 months",
          }}
        />
        <ChartBarEnquiriesBroker
          data={enquiriesChartData}
          footer={{
            description: "Enquiries received per month",
          }}
        />
      </div>

      {/* ── Recent listings ── */}
      <Card>
        <CardHeader className="border-b border-border bg-muted/40 px-5 py-4">
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
                className="mt-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Link href="/dashboard/listings/new">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add your first listing
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
  )
}