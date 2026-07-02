import { redirect } from "next/navigation";
import { getAnalyticsForDashboard } from "@/lib/analytics/actions";
import { AdminAnalyticsDashboard } from "@/components/admin/admin-analytics-dashboard";
import { StaffAuthError, getStaffSession } from "@/lib/auth/staff";
import { isRouteAllowedForRole, ROLE_DEFAULT_ROUTES } from "@/lib/auth/roles";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * Admin analytics page (PRD §5.18 — Intelligence Layer).
 *
 * Owner + Manager only. Fetches all aggregations on the server and passes
 * them as plain serialisable props to the client dashboard, which renders
 * Recharts visualisations.
 *
 * Auth handling:
 *   - Not signed in → redirect to staff sign-in.
 *   - Signed in but not authorised (KITCHEN / FRONT_OF_HOUSE) → render an
 *     inline "not authorised" message with a link back to their default
 *     page. This avoids the confusing UX of redirecting to sign-in for a
 *     user who is already signed in.
 *   - Other errors propagate to Next's error boundary.
 */
export default async function AdminAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { slug } = await params;
  const { days: daysParam } = await searchParams;
  const days = Math.min(Math.max(parseInt(daysParam ?? "30", 10) || 30, 7), 90);

  // Pre-check the session so we can distinguish "not signed in" from
  // "signed in but not authorised" before the analytics action throws.
  const session = await getStaffSession();
  if (!session) {
    redirect(`/${slug}/admin/sign-in`);
  }

  // Defensive: the admin layout should have already redirected if the role
  // isn't allowed, but check again here in case of misconfiguration.
  if (!isRouteAllowedForRole(`/${slug}/admin/analytics`, session.role)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" />
        <h1 className="font-display text-2xl font-bold">Not authorised</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The analytics dashboard is restricted to Owners and Managers.
          You are signed in as <strong>{session.role.replace("_", " ")}</strong>.
        </p>
        <Button asChild className="mt-2">
          <Link href={`/${slug}${ROLE_DEFAULT_ROUTES[session.role] || "/admin"}`}>
            Go to your dashboard
          </Link>
        </Button>
      </div>
    );
  }

  let data;
  try {
    data = await getAnalyticsForDashboard(days);
  } catch (e) {
    if (e instanceof StaffAuthError) {
      // Defensive: should be unreachable given the pre-checks above, but
      // keep the safety net.
      redirect(`/${slug}/admin/sign-in`);
    }
    throw e;
  }

  return <AdminAnalyticsDashboard slug={slug} data={data} />;
}

export async function generateMetadata() {
  return { title: "Analytics" };
}
