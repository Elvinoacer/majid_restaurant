import { redirect } from "next/navigation";
import { getAnalyticsForDashboard } from "@/lib/analytics/actions";
import { AdminAnalyticsDashboard } from "@/components/admin/admin-analytics-dashboard";
import { formatKsh } from "@/lib/whatsapp/order";
import { StaffAuthError } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

/**
 * Admin analytics page (PRD §5.18 — Intelligence Layer).
 *
 * Owner + Manager only. Fetches all aggregations on the server and passes
 * them as plain serialisable props to the client dashboard, which renders
 * Recharts visualisations.
 *
 * Auth is enforced inside `getAnalyticsForDashboard` via `requireStaff`. If
 * the visitor isn't signed in (or isn't OWNER/MANAGER), it throws a
 * `StaffAuthError` — we catch that here and redirect to the staff sign-in
 * page. Other errors propagate to Next's error boundary.
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

  let data;
  try {
    data = await getAnalyticsForDashboard(days);
  } catch (e) {
    if (e instanceof StaffAuthError) {
      redirect(`/${slug}/admin/sign-in`);
    }
    throw e;
  }

  return <AdminAnalyticsDashboard slug={slug} data={data} formatKsh={formatKsh} />;
}

export async function generateMetadata() {
  return { title: "Analytics" };
}
