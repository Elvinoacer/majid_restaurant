"use client";

/**
 * Admin analytics dashboard (PRD §5.18 — Intelligence Layer).
 *
 * Renders 6 visualisations from server-aggregated data:
 *   1. KPI cards  — revenue, orders, AOV, menu views, conversion %, peak hour
 *   2. Revenue trend  — line chart, last N days
 *   3. Conversion funnel — menu views → orders started → orders completed
 *   4. Peak hours heatmap — 7×24 day/hour grid
 *   5. Top items — horizontal bar chart
 *   6. Best-selling drinks — bar chart
 *   7. Returning customer rate — donut chart
 *
 * Mobile-first: every chart collapses to a stack on small screens. Charts
 * use `ResponsiveContainer` so they resize to the parent width.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  ShoppingBag,
  Eye,
  TrendingUp,
  Clock,
  Star,
  Users,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";

// ─── Types (mirror the server-side return shapes) ────────────────────────

type Kpis = {
  totalRevenue30d: number;
  totalOrders30d: number;
  avgOrderValue: number;
  menuViews30d: number;
  conversionRate: number;
  returningCustomerPct: number;
  peakHourLabel: string;
  topItemName: string | null;
};

type RevenuePoint = {
  date: string;
  label: string;
  revenue: number;
  orders: number;
};

type PeakHoursMatrix = {
  dayOfWeek: number;
  dayLabel: string;
  hour: number;
  orders: number;
};

type TopItem = {
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  quantitySold: number;
  revenue: number;
};

type ConversionFunnel = {
  menuViews: number;
  ordersStarted: number;
  ordersCompleted: number;
  menuToStartPct: number;
  startToCompletePct: number;
  overallPct: number;
};

type ReturningCustomerStats = {
  totalCustomers: number;
  returningCustomers: number;
  newCustomers: number;
  returningPct: number;
};

export type AnalyticsDashboardData = {
  kpis: Kpis;
  revenue: RevenuePoint[];
  peakHours: PeakHoursMatrix[];
  topItems: TopItem[];
  bestDrinks: TopItem[];
  funnel: ConversionFunnel;
  returning: ReturningCustomerStats;
  days: number;
};

type DashboardProps = {
  slug: string;
  data: AnalyticsDashboardData;
  formatKsh: (n: number) => string;
};

// ─── Color tokens (kept consistent with the warm restaurant palette) ─────

const CHART_COLORS = {
  primary: "#d97706",     // amber-600 — saffron
  secondary: "#7c2d12",   // red-900 — terracotta
  accent: "#15803d",      // green-700 — turmeric
  purple: "#7c3aed",
  blue: "#1d4ed8",
  grey: "#9ca3af",
};

const HEATMAP_STOPS = [
  "#fef3c7", // 0 — pale cream
  "#fde68a",
  "#fbbf24",
  "#f59e0b",
  "#d97706",
  "#92400e", // max — dark amber
];

// ─── Component ───────────────────────────────────────────────────────────

export function AdminAnalyticsDashboard({ slug, data, formatKsh }: DashboardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState(data.days);

  const changeRange = (next: number) => {
    setDays(next);
    startTransition(() => {
      router.push(`/${slug}/admin/analytics?days=${next}`);
      router.refresh();
    });
  };

  const {
    kpis,
    revenue,
    peakHours,
    topItems,
    bestDrinks,
    funnel,
    returning,
  } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Business intelligence — what to stock, when to staff, what to promote.
          </p>
        </div>
        <DaysRange value={days} onChange={changeRange} disabled={pending} />
      </header>

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label={`Revenue (${data.days}d)`}
          value={`KSh ${formatKsh(kpis.totalRevenue30d)}`}
          icon={<Banknote className="h-4 w-4" />}
          tone="green"
        />
        <KpiCard
          label="Orders"
          value={String(kpis.totalOrders30d)}
          icon={<ShoppingBag className="h-4 w-4" />}
          tone="blue"
        />
        <KpiCard
          label="Avg order value"
          value={`KSh ${formatKsh(kpis.avgOrderValue)}`}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="orange"
        />
        <KpiCard
          label="Menu views"
          value={String(kpis.menuViews30d)}
          icon={<Eye className="h-4 w-4" />}
          tone="purple"
        />
        <KpiCard
          label="Conversion rate"
          value={`${kpis.conversionRate.toFixed(1)}%`}
          icon={<Sparkles className="h-4 w-4" />}
          tone="green"
        />
        <KpiCard
          label="Returning customers"
          value={`${kpis.returningCustomerPct.toFixed(0)}%`}
          icon={<Users className="h-4 w-4" />}
          tone="blue"
        />
        <KpiCard
          label="Peak hour"
          value={kpis.peakHourLabel}
          icon={<Clock className="h-4 w-4" />}
          tone="orange"
        />
        <KpiCard
          label="Top seller"
          value={kpis.topItemName ?? "—"}
          icon={<Star className="h-4 w-4" />}
          tone="purple"
        />
      </section>

      {/* Revenue trend */}
      <ChartCard title="Revenue trend" subtitle={`Daily revenue + order count, last ${data.days} days`}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={revenue} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.7} />
                <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={24}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#9ca3af"
              tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 12,
              }}
              formatter={(v: number, name: string) =>
                name === "revenue" ? [`KSh ${formatKsh(v)}`, "Revenue"] : [v, "Orders"]
              }
              labelFormatter={(_label, payload) => {
                const point = payload?.[0]?.payload as RevenuePoint | undefined;
                return point?.date ?? "";
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              fill="url(#rev)"
              name="revenue"
            />
            <Line
              type="monotone"
              dataKey="orders"
              stroke={CHART_COLORS.secondary}
              strokeWidth={1.5}
              dot={false}
              name="orders"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Conversion funnel + Returning customer rate (side by side on desktop) */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Conversion funnel"
          subtitle="Menu views → orders started → orders completed"
        >
          <FunnelViz funnel={funnel} />
        </ChartCard>
        <ChartCard
          title="Returning customers"
          subtitle="Customers with 2+ orders in the window"
        >
          <ReturningDonut returning={returning} />
        </ChartCard>
      </section>

      {/* Peak hours heatmap */}
      <ChartCard
        title="Peak ordering hours"
        subtitle="Order volume by day × hour — darker = busier. Plan staff schedules around the dark cells."
      >
        <PeakHoursHeatmap matrix={peakHours} />
      </ChartCard>

      {/* Top items + best drinks (side by side on desktop) */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Most-ordered items" subtitle={`Top ${topItems.length} by quantity sold`}>
          {topItems.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, topItems.length * 36)}>
              <BarChart
                data={topItems}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  stroke="#9ca3af"
                  width={120}
                  tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 16) + "…" : v)}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(v: number, name: string) =>
                    name === "quantitySold"
                      ? [`${v} sold`, "Quantity"]
                      : [`KSh ${formatKsh(v)}`, "Revenue"]
                  }
                />
                <Bar
                  dataKey="quantitySold"
                  fill={CHART_COLORS.primary}
                  radius={[0, 4, 4, 0]}
                  name="quantitySold"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title="Best-selling drinks" subtitle={`Top ${bestDrinks.length} drinks by quantity`}>
          {bestDrinks.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, bestDrinks.length * 36)}>
              <BarChart
                data={bestDrinks}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  stroke="#9ca3af"
                  width={120}
                  tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 16) + "…" : v)}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(v: number) => [`${v} sold`, "Quantity"]}
                />
                <Bar
                  dataKey="quantitySold"
                  fill={CHART_COLORS.accent}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* Footer: link back to overview */}
      <section className="rounded-xl border border-border bg-card p-4">
        <Link
          href={`/${slug}/admin`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Back to overview <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function DaysRange({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled: boolean;
}) {
  const options = [7, 30, 90];
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          disabled={disabled}
          className={cn(
            "rounded px-3 py-1 text-xs font-medium transition-colors",
            value === opt
              ? "bg-primary text-primary-foreground"
              : "text-foreground/70 hover:bg-accent/10",
            disabled && "opacity-50",
          )}
        >
          {opt}d
        </button>
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "green" | "blue" | "purple" | "orange";
}) {
  const toneClasses = {
    green: "bg-green-500/10 text-green-700",
    blue: "bg-blue-500/10 text-blue-700",
    purple: "bg-purple-500/10 text-purple-700",
    orange: "bg-orange-500/10 text-orange-700",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", toneClasses[tone])}>
          {icon}
        </span>
      </div>
      <p className="mt-2 font-display text-base font-bold leading-tight sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <header className="mb-3">
        <h2 className="font-display text-base font-bold sm:text-lg">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
      No data in this range yet.
    </div>
  );
}

/**
 * Conversion funnel — three stacked horizontal bars with the conversion
 * percentages between each stage.
 */
function FunnelViz({ funnel }: { funnel: ConversionFunnel }) {
  const stages = [
    { label: "Menu views", value: funnel.menuViews, color: CHART_COLORS.grey },
    { label: "Orders started", value: funnel.ordersStarted, color: CHART_COLORS.primary },
    { label: "Orders completed", value: funnel.ordersCompleted, color: CHART_COLORS.accent },
  ];
  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const pct = (stage.value / maxValue) * 100;
        const convPct =
          i === 0
            ? null
            : i === 1
              ? funnel.menuToStartPct
              : funnel.startToCompletePct;
        return (
          <div key={stage.label}>
            {convPct !== null && (
              <div className="mb-1 text-xs text-muted-foreground">
                ↓ {convPct.toFixed(1)}% from previous step
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-28 shrink-0 text-sm text-foreground/80">{stage.label}</div>
              <div className="relative h-9 flex-1 overflow-hidden rounded-md bg-muted">
                <div
                  className="absolute inset-y-0 left-0 flex items-center justify-end rounded-md px-2 text-xs font-semibold text-white"
                  style={{
                    width: `${Math.max(pct, stage.value > 0 ? 12 : 0)}%`,
                    backgroundColor: stage.color,
                  }}
                >
                  {stage.value}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div className="border-t border-border pt-2 text-xs text-muted-foreground">
        Overall conversion:{" "}
        <span className="font-semibold text-foreground">
          {funnel.overallPct.toFixed(1)}%
        </span>{" "}
        of menu viewers completed an order.
      </div>
    </div>
  );
}

/**
 * Returning customer rate — donut chart with new vs returning slices.
 */
function ReturningDonut({ returning }: { returning: ReturningCustomerStats }) {
  const data = [
    { name: "Returning", value: returning.returningCustomers, color: CHART_COLORS.accent },
    { name: "New", value: returning.newCustomers, color: CHART_COLORS.primary },
  ];
  const total = returning.totalCustomers;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <ResponsiveContainer width="100%" height={180} className="sm:!w-1/2">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={2}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
            formatter={(v: number, name: string) => [v, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Total customers</span>
          <span className="font-semibold">{total}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Returning</span>
          <span className="font-semibold text-green-700">{returning.returningCustomers}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">New</span>
          <span className="font-semibold text-amber-700">{returning.newCustomers}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
          <span className="text-muted-foreground">Returning rate</span>
          <span className="font-bold">{returning.returningPct.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Peak hours heatmap — 7 rows × 24 columns grid. Cells are coloured on a
 * 6-stop amber scale (light → dark). Hover shows the order count.
 *
 * Pure CSS Grid (no Recharts dependency) — renders cleanly on mobile by
 * making the hour columns horizontally scrollable when needed.
 */
function PeakHoursHeatmap({ matrix }: { matrix: PeakHoursMatrix[] }) {
  // Group by day for rows.
  const days = Array.from(new Set(matrix.map((m) => m.dayOfWeek))).sort(
    (a, b) => a - b,
  );
  const maxOrders = Math.max(...matrix.map((m) => m.orders), 1);

  const colorFor = (orders: number) => {
    if (orders === 0) return HEATMAP_STOPS[0];
    const ratio = orders / maxOrders;
    const idx = Math.min(HEATMAP_STOPS.length - 1, Math.floor(ratio * (HEATMAP_STOPS.length - 1)));
    return HEATMAP_STOPS[idx];
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Hour labels (top row) */}
        <div
          className="grid gap-px text-[10px] text-muted-foreground"
          style={{ gridTemplateColumns: "36px repeat(24, minmax(0, 1fr))" }}
        >
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center">
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
        </div>

        {/* Day rows */}
        {days.map((dow) => {
          const dayLabel = matrix.find((m) => m.dayOfWeek === dow)?.dayLabel ?? "";
          const cells = matrix.filter((m) => m.dayOfWeek === dow).sort((a, b) => a.hour - b.hour);
          return (
            <div
              key={dow}
              className="grid gap-px"
              style={{ gridTemplateColumns: "36px repeat(24, minmax(0, 1fr))" }}
            >
              <div className="py-1 text-[10px] font-medium text-muted-foreground">
                {dayLabel}
              </div>
              {cells.map((c) => (
                <div
                  key={`${dow}-${c.hour}`}
                  title={`${dayLabel} ${String(c.hour).padStart(2, "0")}:00 — ${c.orders} order${c.orders === 1 ? "" : "s"}`}
                  className="aspect-square w-full rounded-sm transition-transform hover:scale-110"
                  style={{ backgroundColor: colorFor(c.orders) }}
                />
              ))}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
        Less
        {HEATMAP_STOPS.map((c, i) => (
          <span
            key={i}
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: c }}
          />
        ))}
        More
      </div>
    </div>
  );
}
