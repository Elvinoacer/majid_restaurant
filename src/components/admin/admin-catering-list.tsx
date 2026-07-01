"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateInquiryStatus } from "@/lib/catering/actions";
import type { InquiryStatus } from "@/generated/prisma/client";

type Inquiry = {
  id: string;
  status: InquiryStatus;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  eventDate: string;
  guestCount: number;
  budgetRange: string | null;
  preferredCuisine: string | null;
  eventType: string | null;
  notes: string | null;
  createdAt: string;
};

const STATUS_COLOR: Record<InquiryStatus, string> = {
  NEW: "bg-blue-500/15 text-blue-700",
  CONTACTED: "bg-yellow-500/15 text-yellow-700",
  QUOTED: "bg-purple-500/15 text-purple-700",
  CONFIRMED: "bg-green-500/15 text-green-700",
  COMPLETED: "bg-muted text-foreground",
  DECLINED: "bg-red-500/15 text-red-700",
};

const NEXT_ACTIONS: Partial<Record<InquiryStatus, InquiryStatus[]>> = {
  NEW: ["CONTACTED", "DECLINED"],
  CONTACTED: ["QUOTED", "DECLINED"],
  QUOTED: ["CONFIRMED", "DECLINED"],
  CONFIRMED: ["COMPLETED", "DECLINED"],
  COMPLETED: [],
  DECLINED: [],
};

export function AdminCateringList({ inquiries }: { inquiries: Inquiry[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleStatusChange = (id: string, status: InquiryStatus) => {
    startTransition(async () => {
      const result = await updateInquiryStatus({ inquiryId: id, status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Inquiry marked ${status.toLowerCase()}`);
      router.refresh();
    });
  };

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Catering inquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workflow: New → Contacted → Quoted → Confirmed → Completed (or Declined at any step).
        </p>
      </header>

      {inquiries.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No catering inquiries yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {inquiries.map((inq) => (
            <li key={inq.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[inq.status]}`}>
                      {inq.status.toLowerCase()}
                    </span>
                    <span className="font-medium">{inq.contactName}</span>
                    <span className="text-xs text-muted-foreground">
                      received {new Date(inq.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Event date:</span>{" "}
                      <span className="font-medium">{new Date(inq.eventDate).toLocaleDateString()}</span>
                      {" · "}
                      <span className="text-muted-foreground">Guests:</span> {inq.guestCount}
                      {inq.eventType && (
                        <>
                          {" · "}
                          <span className="text-muted-foreground">Type:</span>{" "}
                          <span className="capitalize">{inq.eventType}</span>
                        </>
                      )}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Contact:</span>{" "}
                      {inq.contactPhone}
                      {inq.contactEmail ? ` · ${inq.contactEmail}` : ""}
                    </p>
                    {inq.budgetRange && (
                      <p>
                        <span className="text-muted-foreground">Budget:</span> {inq.budgetRange}
                      </p>
                    )}
                    {inq.preferredCuisine && (
                      <p>
                        <span className="text-muted-foreground">Cuisine pref:</span> {inq.preferredCuisine}
                      </p>
                    )}
                    {inq.notes && (
                      <p className="mt-1 rounded-md bg-muted/40 p-2 text-xs">
                        <span className="text-muted-foreground">Notes:</span> {inq.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {NEXT_ACTIONS[inq.status]?.length ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">Move to:</span>
                  {NEXT_ACTIONS[inq.status]!.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => handleStatusChange(inq.id, s)}
                    >
                      {pending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      {s.toLowerCase()}
                    </Button>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
