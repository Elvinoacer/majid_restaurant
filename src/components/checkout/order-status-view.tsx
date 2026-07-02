"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  PackageSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatKsh } from "@/lib/whatsapp/order";
import { cancelOrder } from "@/lib/orders/actions";
import { toast } from "sonner";
import { Container } from "@/components/premium/container";
import { PageHeader } from "@/components/premium/page-header";
import { PremiumCard } from "@/components/premium/card";
import { StatusPill, type StatusTone } from "@/components/premium/status-pill";

type OrderStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

type Order = {
  id: string;
  status: OrderStatus;
  fulfillmentType: "DELIVERY" | "PICKUP" | "DINE_IN";
  total: number;
  guestName: string | null;
  guestPhone: string | null;
  deliveryAddress: string | null;
  specialInstructions: string | null;
  createdAt: string;
  paidAt: string | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    notes: string | null;
    menuItem: { name: string; imageUrl: string | null };
  }>;
};

const STATUS_META: Record<
  OrderStatus,
  { label: string; tone: StatusTone; icon: React.ReactNode; description: string; pulse?: boolean }
> = {
  DRAFT: { label: "Draft", tone: "neutral", icon: <Clock className="h-3 w-3" />, description: "Your order hasn't been submitted yet." },
  PENDING_PAYMENT: { label: "Waiting for M-Pesa", tone: "warning", icon: <Loader2 className="h-3 w-3 animate-spin" />, description: "Enter your M-Pesa PIN on your phone to complete payment.", pulse: true },
  CONFIRMED: { label: "Confirmed", tone: "info", icon: <CheckCircle2 className="h-3 w-3" />, description: "We've got your order. The kitchen will start on it shortly." },
  PREPARING: { label: "Preparing", tone: "warning", icon: <Clock className="h-3 w-3" />, description: "The kitchen is on it.", pulse: true },
  READY: { label: "Ready", tone: "success", icon: <CheckCircle2 className="h-3 w-3" />, description: "Your order is ready! Come pick it up or it'll be with you shortly." },
  OUT_FOR_DELIVERY: { label: "Out for delivery", tone: "info", icon: <Clock className="h-3 w-3" />, description: "Your order is on its way." },
  DELIVERED: { label: "Delivered", tone: "success", icon: <CheckCircle2 className="h-3 w-3" />, description: "Enjoy your meal!" },
  COMPLETED: { label: "Completed", tone: "neutral", icon: <CheckCircle2 className="h-3 w-3" />, description: "Thanks for ordering! Consider leaving a review." },
  CANCELLED: { label: "Cancelled", tone: "danger", icon: <XCircle className="h-3 w-3" />, description: "This order was cancelled." },
};

export function OrderStatusView({
  slug,
  orderId,
  initialOrder,
}: {
  slug: string;
  orderId: string;
  initialOrder: Order | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justWentPending = searchParams.get("pending") === "mpesa";
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [, startTransition] = useTransition();

  // Poll for status updates while the order is in a transitional state.
  useEffect(() => {
    if (!order) return;
    const transitional: OrderStatus[] = ["PENDING_PAYMENT", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];
    if (!transitional.includes(order.status)) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { order: Order };
          setOrder(data.order);
        }
      } catch {
        // ignore — next interval will retry
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [order, orderId]);

  if (!order) {
    return (
      <Container size="narrow" className="py-12 sm:py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <PackageSearch className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-semibold">Order not found</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          This order doesn&apos;t exist or doesn&apos;t belong to this account.
        </p>
        <Button asChild className="mt-5">
          <Link href={`/${slug}/menu`}>Back to menu</Link>
        </Button>
      </Container>
    );
  }

  const meta = STATUS_META[order.status];

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelOrder(orderId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Order cancelled");
      router.refresh();
    });
  };

  const canCancel = order.status === "DRAFT" || order.status === "PENDING_PAYMENT";
  const canReview = order.status === "COMPLETED";

  return (
    <Container size="narrow" className="py-6 sm:py-10">
      <PageHeader
        eyebrow={`Order #${order.id.slice(-6).toUpperCase()}`}
        title={meta.label}
        subtitle={meta.description}
        actions={
          <StatusPill tone={meta.tone} pulse={meta.pulse}>
            {meta.label}
          </StatusPill>
        }
      />

      <p className="-mt-3 mb-5 text-xs text-muted-foreground">
        Placed {new Date(order.createdAt).toLocaleString()}
      </p>

      {justWentPending && order.status === "PENDING_PAYMENT" && (
        <div className="mb-5 rounded-2xl border border-warning/40 bg-warning-muted p-4 text-sm text-warning-foreground">
          <strong className="font-semibold">Check your phone.</strong> You should
          receive an M-Pesa prompt on{" "}
          <strong className="font-semibold">{order.guestPhone}</strong>. Enter your
          PIN to authorize payment. This page will update automatically.
        </div>
      )}

      {/* Items */}
      <PremiumCard className="mb-5 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Items
        </h2>
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                {item.menuItem.imageUrl && (
                  <Image
                    src={item.menuItem.imageUrl}
                    alt={item.menuItem.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{item.menuItem.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity}× KSh {formatKsh(item.unitPrice)}
                  {item.notes ? ` · ${item.notes}` : ""}
                </p>
              </div>
              <span className="font-medium tabular-nums text-foreground">
                KSh {formatKsh(item.unitPrice * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3">
          <span className="font-semibold text-foreground">Total</span>
          <span className="font-display text-lg font-bold tabular-nums">
            <span className="text-xs font-normal text-muted-foreground">KSh </span>
            {formatKsh(order.total)}
          </span>
        </div>
      </PremiumCard>

      {/* Details */}
      <PremiumCard className="mb-5 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Details
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Fulfillment</dt>
            <dd className="font-medium capitalize text-foreground">
              {order.fulfillmentType.toLowerCase().replace("_", " ")}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium text-foreground">{order.guestName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-medium text-foreground">{order.guestPhone}</dd>
          </div>
          {order.deliveryAddress && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="max-w-[60%] text-right font-medium text-foreground">
                {order.deliveryAddress}
              </dd>
            </div>
          )}
          {order.paidAt && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Paid</dt>
              <dd className="font-medium text-foreground">
                {new Date(order.paidAt).toLocaleString()}
              </dd>
            </div>
          )}
        </dl>
      </PremiumCard>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canCancel && (
          <Button variant="outline" onClick={handleCancel}>
            Cancel order
          </Button>
        )}
        {canReview && (
          <Button asChild className="gap-1.5">
            <Link href={`/${slug}/orders/${order.id}/review`}>
              Leave a review
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={`/${slug}/menu`}>Back to menu</Link>
        </Button>
      </div>
    </Container>
  );
}
