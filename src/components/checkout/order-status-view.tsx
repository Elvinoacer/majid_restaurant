"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, Clock, XCircle, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatKsh } from "@/lib/whatsapp/order";
import { cancelOrder } from "@/lib/orders/actions";
import { toast } from "sonner";

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

const STATUS_META: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  DRAFT: { label: "Draft", color: "bg-muted text-foreground", icon: <Clock className="h-4 w-4" />, description: "Your order hasn't been submitted yet." },
  PENDING_PAYMENT: { label: "Waiting for M-Pesa", color: "bg-yellow-500/15 text-yellow-700", icon: <Loader2 className="h-4 w-4 animate-spin" />, description: "Enter your M-Pesa PIN on your phone to complete payment." },
  CONFIRMED: { label: "Confirmed", color: "bg-blue-500/15 text-blue-700", icon: <CheckCircle2 className="h-4 w-4" />, description: "We've got your order. The kitchen will start on it shortly." },
  PREPARING: { label: "Preparing", color: "bg-orange-500/15 text-orange-700", icon: <Clock className="h-4 w-4" />, description: "The kitchen is on it." },
  READY: { label: "Ready", color: "bg-green-500/15 text-green-700", icon: <CheckCircle2 className="h-4 w-4" />, description: "Your order is ready! Come pick it up or it'll be with you shortly." },
  OUT_FOR_DELIVERY: { label: "Out for delivery", color: "bg-purple-500/15 text-purple-700", icon: <Clock className="h-4 w-4" />, description: "Your order is on its way." },
  DELIVERED: { label: "Delivered", color: "bg-green-500/15 text-green-700", icon: <CheckCircle2 className="h-4 w-4" />, description: "Enjoy your meal!" },
  COMPLETED: { label: "Completed", color: "bg-muted text-foreground", icon: <CheckCircle2 className="h-4 w-4" />, description: "Thanks for ordering! Consider leaving a review." },
  CANCELLED: { label: "Cancelled", color: "bg-red-500/15 text-red-700", icon: <XCircle className="h-4 w-4" />, description: "This order was cancelled." },
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
  // M-Pesa callbacks typically land within 30s.
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
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h2 className="font-display text-xl font-semibold">Order not found</h2>
        <Button asChild className="mt-4">
          <Link href={`/${slug}/menu`}>Back to menu</Link>
        </Button>
      </div>
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
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Order #{order.id.slice(-6).toUpperCase()}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.color}`}>
            {meta.icon}
            {meta.label}
          </span>
          <span className="text-sm text-muted-foreground">
            Placed {new Date(order.createdAt).toLocaleString()}
          </span>
        </div>
        <p className="mt-2 text-sm text-foreground/80">{meta.description}</p>
        {justWentPending && order.status === "PENDING_PAYMENT" && (
          <div className="mt-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
            <strong>Check your phone.</strong> You should receive an M-Pesa prompt
            on <strong>{order.guestPhone}</strong>. Enter your PIN to authorize
            payment. This page will update automatically.
          </div>
        )}
      </header>

      {/* Items */}
      <section className="mb-5 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Items
        </h2>
        <ul className="space-y-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {item.menuItem.imageUrl && (
                   
                  <img
                    src={item.menuItem.imageUrl}
                    alt={item.menuItem.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{item.menuItem.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity}× KSh {formatKsh(item.unitPrice)}
                  {item.notes ? ` · ${item.notes}` : ""}
                </p>
              </div>
              <span className="font-medium">KSh {formatKsh(item.unitPrice * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3">
          <span className="font-semibold">Total</span>
          <span className="font-display text-lg font-bold">KSh {formatKsh(order.total)}</span>
        </div>
      </section>

      {/* Details */}
      <section className="mb-5 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Details
        </h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Fulfillment</dt>
            <dd className="font-medium">{order.fulfillmentType.toLowerCase().replace("_", " ")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{order.guestName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-medium">{order.guestPhone}</dd>
          </div>
          {order.deliveryAddress && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="max-w-[60%] text-right font-medium">{order.deliveryAddress}</dd>
            </div>
          )}
          {order.paidAt && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Paid</dt>
              <dd className="font-medium">{new Date(order.paidAt).toLocaleString()}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canCancel && (
          <Button variant="outline" onClick={handleCancel}>
            Cancel order
          </Button>
        )}
        {canReview && (
          <Button asChild>
            <Link href={`/${slug}/orders/${order.id}/review`}>
              Leave a review
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={`/${slug}/menu`}>Back to menu</Link>
        </Button>
      </div>
    </div>
  );
}
