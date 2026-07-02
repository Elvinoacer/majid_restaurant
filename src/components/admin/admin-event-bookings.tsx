"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateEventBookingStatus } from "@/lib/events/actions";
import type { InquiryStatus } from "@/generated/prisma/client";

type Booking = {
  id: string;
  contactName: string;
  contactPhone: string;
  eventDate: string;
  durationHours: number;
  guestCount: number;
  setupNeeds: string | null;
  status: InquiryStatus;
  createdAt: string;
};

type Props = {
  slug: string;
  restaurantName: string;
  hasEventSpace: boolean;
  initialBookings: Booking[];
};

const FLOW: Record<InquiryStatus, InquiryStatus[]> = {
  NEW: ["CONTACTED", "QUOTED", "CONFIRMED", "DECLINED"],
  CONTACTED: ["QUOTED", "CONFIRMED", "DECLINED"],
  QUOTED: ["CONFIRMED", "DECLINED"],
  CONFIRMED: ["COMPLETED", "DECLINED"],
  COMPLETED: [],
  DECLINED: [],
};

const STATUS_COLOR: Record<InquiryStatus, string> = {
  NEW: "bg-yellow-500/15 text-yellow-700",
  CONTACTED: "bg-blue-500/15 text-blue-700",
  QUOTED: "bg-purple-500/15 text-purple-700",
  CONFIRMED: "bg-green-500/15 text-green-700",
  COMPLETED: "bg-muted text-foreground",
  DECLINED: "bg-red-500/15 text-red-700",
};

export function AdminEventBookings({
  slug,
  restaurantName,
  hasEventSpace,
  initialBookings,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "active" | InquiryStatus>("active");

  if (!hasEventSpace) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Event bookings</h1>
        <p className="mt-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          {restaurantName} doesn&apos;t have bookable event space configured.
          Enable the &quot;has event space&quot; flag on the restaurant to accept
          event bookings here.
        </p>
      </div>
    );
  }

  const filtered = initialBookings.filter((b) => {
    if (filter === "all") return true;
    if (filter === "active") return !["COMPLETED", "DECLINED"].includes(b.status);
    return b.status === filter;
  });

  const handleStatusChange = (id: string, status: InquiryStatus) => {
    startTransition(async () => {
      const res = await updateEventBookingStatus({ bookingId: id, status });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(`Marked as ${status.toLowerCase()}.`);
      router.refresh();
    });
  };

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Event bookings</h1>
        <select
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="active">Active</option>
          <option value="all">All</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="QUOTED">Quoted</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="DECLINED">Declined</option>
        </select>
      </header>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No event bookings match this filter. New bookings from the public
          events page will appear here.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((b) => (
            <li key={b.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_COLOR[b.status])}>
                      {b.status.toLowerCase()}
                    </span>
                    <span className="font-medium">{b.contactName}</span>
                    <span className="text-xs text-muted-foreground">
                      · {b.contactPhone}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <p className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <strong>{new Date(b.eventDate).toLocaleString()}</strong>
                      <span className="text-muted-foreground">· {b.durationHours}h · {b.guestCount} guests</span>
                    </p>
                    {b.setupNeeds && (
                      <p className="mt-1 rounded-md bg-muted/40 p-2 text-xs">
                        <span className="text-muted-foreground">Setup:</span> {b.setupNeeds}
                      </p>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Submitted {new Date(b.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {FLOW[b.status].length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">Move to:</span>
                  {FLOW[b.status].map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => handleStatusChange(b.id, s)}
                    >
                      {s.toLowerCase()}
                    </Button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
