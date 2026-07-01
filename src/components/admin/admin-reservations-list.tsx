"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateReservationStatus } from "@/lib/reservations/actions";
import type { ReservationStatus } from "@/generated/prisma/client";

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

const STATUS_COLOR: Record<ReservationStatus, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-700",
  CONFIRMED: "bg-green-500/15 text-green-700",
  SEATED: "bg-blue-500/15 text-blue-700",
  COMPLETED: "bg-muted text-foreground",
  CANCELLED: "bg-red-500/15 text-red-700",
  NO_SHOW: "bg-orange-500/15 text-orange-700",
};

const NEXT_ACTIONS: Partial<Record<ReservationStatus, ReservationStatus[]>> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SEATED", "NO_SHOW", "CANCELLED"],
  SEATED: ["COMPLETED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function AdminReservationsList({
  reservations,
}: {
  reservations: Reservation[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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

  // Group by day
  const byDay = new Map<string, Reservation[]>();
  for (const r of reservations) {
    const d = new Date(r.reservedFor);
    const key = d.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "short" });
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(r);
  }

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Reservations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Next 7 days. Confirm, seat, or mark no-show as guests arrive.
        </p>
      </header>

      {reservations.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No upcoming reservations.
        </p>
      ) : (
        <div className="space-y-6">
          {Array.from(byDay.entries()).map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {day}
              </h2>
              <ul className="space-y-2">
                {list.map((r) => (
                  <li key={r.id} className="rounded-xl border border-border bg-card p-3 sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[r.status]}`}>
                            {r.status.toLowerCase().replace("_", " ")}
                          </span>
                          <span className="font-medium">
                            {new Date(r.reservedFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
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
                            onClick={() => handleStatusChange(r.id, s)}
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
      )}
    </div>
  );
}
