"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Calendar as CalendarIcon, List, Clock, Users, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateReservationStatus } from "@/lib/reservations/actions";
import type { ReservationStatus } from "@/generated/prisma/client";
import { PageHeader } from "@/components/premium/page-header";
import { StatusPill, type StatusTone } from "@/components/premium/status-pill";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumCard } from "@/components/premium/card";

type Reservation = {
  id: string;
  status: ReservationStatus;
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservedFor: string;
  occasion: string | null;
  seatingPref: string | null;
  notes: string | null;
  createdAt: string;
};

const STATUS_TONE: Record<ReservationStatus, StatusTone> = {
  PENDING: "warning",
  CONFIRMED: "success",
  SEATED: "info",
  COMPLETED: "neutral",
  CANCELLED: "danger",
  NO_SHOW: "warning",
};

const STATUS_BORDER: Record<ReservationStatus, string> = {
  PENDING: "border-warning/30",
  CONFIRMED: "border-success/30",
  SEATED: "border-info/30",
  COMPLETED: "border-border",
  CANCELLED: "border-danger/30",
  NO_SHOW: "border-warning/30",
};

const NEXT_ACTIONS: Partial<Record<ReservationStatus, ReservationStatus[]>> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SEATED", "NO_SHOW", "CANCELLED"],
  SEATED: ["COMPLETED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

type ViewMode = "week" | "day" | "list";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDay(d: Date) {
  return d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function AdminReservationsList({
  reservations,
}: {
  reservations: Reservation[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()));

  const handleStatusChange = (id: string, status: ReservationStatus) => {
    startTransition(async () => {
      const result = await updateReservationStatus({ reservationId: id, status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Reservation marked ${status.toLowerCase().replace("_", " ")}`);
      router.refresh();
    });
  };

  // Filter reservations to the visible window for the current view.
  const visible = useMemo(() => {
    if (view === "day") {
      return reservations.filter((r) => isSameDay(new Date(r.reservedFor), cursor));
    }
    if (view === "week") {
      const start = startOfWeek(cursor);
      const end = addDays(start, 7);
      return reservations.filter((r) => {
        const d = new Date(r.reservedFor);
        return d >= start && d < end;
      });
    }
    return reservations;
  }, [reservations, view, cursor]);

  return (
    <div>
      <PageHeader
        title="Reservations"
        subtitle="Confirm, seat, or mark no-show as guests arrive. Calendar shows the next 7 days by default."
        actions={
          <div className="flex flex-wrap items-center gap-2">
          {/* View switcher */}
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="tablist" aria-label="View mode">
            {(["week", "day", "list"] as ViewMode[]).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "list" ? <List className="h-3.5 w-3.5" /> : <CalendarIcon className="h-3.5 w-3.5" />}
                {v}
              </button>
            ))}
          </div>

          {/* Cursor nav (week / day only) */}
          {view !== "list" && (
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCursor((c) => addDays(c, view === "day" ? -1 : -7))}
                aria-label={view === "day" ? "Previous day" : "Previous week"}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setCursor(startOfDay(new Date()))}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCursor((c) => addDays(c, view === "day" ? 1 : 7))}
                aria-label={view === "day" ? "Next day" : "Next week"}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        }
      />

      {reservations.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="h-7 w-7" />}
          title="No upcoming reservations"
          description="Reservations for the next 7 days will appear here as they're requested."
        />
      ) : view === "list" ? (
        <ListView reservations={visible} onStatusChange={handleStatusChange} pending={pending} />
      ) : view === "day" ? (
        <DayView date={cursor} reservations={visible} onStatusChange={handleStatusChange} pending={pending} />
      ) : (
        <WeekView start={startOfWeek(cursor)} reservations={visible} onStatusChange={handleStatusChange} pending={pending} onSelectDay={(d) => { setCursor(d); setView("day"); }} />
      )}
    </div>
  );
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const dow = x.getDay(); // 0 = Sunday
  return addDays(x, -dow);
}

function ReservationChip({
  r,
  onStatusChange,
  pending,
  showTime = true,
}: {
  r: Reservation;
  onStatusChange: (id: string, s: ReservationStatus) => void;
  pending: boolean;
  showTime?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-2 text-xs elevation-1 transition-all hover:elevation-2",
        STATUS_BORDER[r.status],
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-1 text-left"
        aria-expanded={expanded}
        aria-label={`Reservation for ${r.guestName}, party of ${r.partySize}`}
      >
        <span className="font-medium">
          {showTime && <>{fmtTime(r.reservedFor)} · </>}
          {r.guestName}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider">
          <Users className="h-3 w-3" />
          {r.partySize}
        </span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5 border-t border-current/20 pt-2">
          <p className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {r.guestPhone}
          </p>
          <p className="inline-flex items-center gap-1">
            <span className="font-semibold uppercase text-[10px]">Status:</span>
            <span>{r.status.toLowerCase().replace("_", " ")}</span>
          </p>
          {r.occasion && (
            <p className="text-muted-foreground">
              Occasion: {r.occasion}
              {r.seatingPref ? ` · seating: ${r.seatingPref}` : ""}
            </p>
          )}
          {r.notes && (
            <p className="rounded bg-background/60 p-1.5 text-[11px]">
              <span className="text-muted-foreground">Notes:</span> {r.notes}
            </p>
          )}
          {NEXT_ACTIONS[r.status]?.length ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {NEXT_ACTIONS[r.status]!.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  disabled={pending}
                  onClick={() => onStatusChange(r.id, s)}
                >
                  {pending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  {s.toLowerCase().replace("_", " ")}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function WeekView({
  start,
  reservations,
  onStatusChange,
  pending,
  onSelectDay,
}: {
  start: Date;
  reservations: Reservation[];
  onStatusChange: (id: string, s: ReservationStatus) => void;
  pending: boolean;
  onSelectDay: (d: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const byDay = days.map((d) => ({
    day: d,
    items: reservations
      .filter((r) => isSameDay(new Date(r.reservedFor), d))
      .sort((a, b) => new Date(a.reservedFor).getTime() - new Date(b.reservedFor).getTime()),
  }));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {byDay.map(({ day, items }) => (
        <div key={day.toISOString()} className="min-h-[160px] rounded-xl border border-border bg-card/50 p-2">
          <button
            type="button"
            onClick={() => onSelectDay(day)}
            className={cn(
              "mb-2 flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs font-semibold",
              isSameDay(day, new Date()) ? "bg-primary/10 text-primary" : "text-foreground",
            )}
            aria-label={`Open day view for ${fmtDay(day)}`}
          >
            <span>{fmtDay(day)}</span>
            <span className="text-[10px] text-muted-foreground">{items.length}</span>
          </button>
          <div className="space-y-1.5">
            {items.length === 0 ? (
              <p className="px-1 py-2 text-[10px] text-muted-foreground">No bookings</p>
            ) : (
              items.map((r) => (
                <ReservationChip
                  key={r.id}
                  r={r}
                  onStatusChange={onStatusChange}
                  pending={pending}
                  showTime
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DayView({
  date,
  reservations,
  onStatusChange,
  pending,
}: {
  date: Date;
  reservations: Reservation[];
  onStatusChange: (id: string, s: ReservationStatus) => void;
  pending: boolean;
}) {
  // Group by hour from 11:00 → 22:00 (typical restaurant hours).
  const hours = Array.from({ length: 12 }, (_, i) => 11 + i);
  const byHour = new Map<number, Reservation[]>();
  for (const r of reservations) {
    const h = new Date(r.reservedFor).getHours();
    if (!byHour.has(h)) byHour.set(h, []);
    byHour.get(h)!.push(r);
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-display text-sm font-semibold">
          {date.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </h2>
        <p className="text-xs text-muted-foreground">
          {reservations.length} reservation{reservations.length === 1 ? "" : "s"} ·{" "}
          {reservations.reduce((s, r) => s + r.partySize, 0)} covers
        </p>
      </div>
      <div className="divide-y divide-border">
        {hours.map((h) => {
          const items = (byHour.get(h) ?? []).sort(
            (a, b) => new Date(a.reservedFor).getTime() - new Date(b.reservedFor).getTime(),
          );
          return (
            <div key={h} className="flex gap-3 px-4 py-3">
              <div className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
                <Clock className="mb-0.5 inline h-3 w-3" />
                <div>{h.toString().padStart(2, "0")}:00</div>
              </div>
              <div className="flex-1 space-y-1.5">
                {items.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/60">—</p>
                ) : (
                  items.map((r) => (
                    <ReservationChip
                      key={r.id}
                      r={r}
                      onStatusChange={onStatusChange}
                      pending={pending}
                      showTime
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({
  reservations,
  onStatusChange,
  pending,
}: {
  reservations: Reservation[];
  onStatusChange: (id: string, s: ReservationStatus) => void;
  pending: boolean;
}) {
  // Group by day
  const byDay = new Map<string, Reservation[]>();
  for (const r of reservations) {
    const d = new Date(r.reservedFor);
    const key = d.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "short" });
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(r);
  }

  return (
    <div className="space-y-6">
      {Array.from(byDay.entries()).map(([day, list]) => (
        <section key={day}>
          <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {day}
          </h2>
          <ul className="space-y-2">
            {list.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4 elevation-1 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusPill tone={STATUS_TONE[r.status]}>
                        {r.status.toLowerCase().replace("_", " ")}
                      </StatusPill>
                      <span className="font-medium">{fmtTime(r.reservedFor)}</span>
                      <span>·</span>
                      <span>party of {r.partySize}</span>
                    </div>
                    <p className="mt-1 text-sm">
                      <span className="font-medium">{r.guestName}</span> · {r.guestPhone}
                    </p>
                    {r.occasion && (
                      <p className="text-xs text-muted-foreground">
                        Occasion: {r.occasion}
                        {r.seatingPref ? ` · seating: ${r.seatingPref}` : ""}
                      </p>
                    )}
                    {r.notes && (
                      <p className="mt-1 rounded-md bg-muted/40 p-2 text-xs">
                        <span className="text-muted-foreground">Notes:</span> {r.notes}
                      </p>
                    )}
                  </div>
                </div>
                {NEXT_ACTIONS[r.status]?.length ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">Action:</span>
                    {NEXT_ACTIONS[r.status]!.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onStatusChange(r.id, s)}
                      >
                        {pending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        {s.toLowerCase().replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
