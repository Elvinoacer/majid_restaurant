"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatKsh } from "@/lib/whatsapp/order";
import { updateOrderStatus } from "@/lib/orders/actions";
import type { OrderStatus, FulfillmentType } from "@/generated/prisma/client";

type Order = {
  id: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
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

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "COMPLETED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  DRAFT: "bg-muted text-foreground",
  PENDING_PAYMENT: "bg-yellow-500/15 text-yellow-700",
  CONFIRMED: "bg-blue-500/15 text-blue-700",
  PREPARING: "bg-orange-500/15 text-orange-700",
  READY: "bg-green-500/15 text-green-700",
  OUT_FOR_DELIVERY: "bg-purple-500/15 text-purple-700",
  DELIVERED: "bg-green-500/15 text-green-700",
  COMPLETED: "bg-muted text-foreground",
  CANCELLED: "bg-red-500/15 text-red-700",
};

export function AdminOrdersList({
  slug,
  initialOrders,
}: {
  slug: string;
  initialOrders: Order[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | OrderStatus>("active");

  const filtered = initialOrders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "active") return !["COMPLETED", "CANCELLED", "DRAFT"].includes(o.status);
    return o.status === filter;
  });

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setPendingOrderId(orderId);
    startTransition(async () => {
      try {
        const result = await updateOrderStatus({ orderId, status: newStatus });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(`Order marked as ${newStatus.toLowerCase().replace("_", " ")}`);
        router.refresh();
      } finally {
        setPendingOrderId(null);
      }
    });
  };

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Orders</h1>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="PENDING_PAYMENT">Pending payment</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="PREPARING">Preparing</SelectItem>
            <SelectItem value="READY">Ready</SelectItem>
            <SelectItem value="OUT_FOR_DELIVERY">Out for delivery</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </header>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No orders match this filter.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((order) => (
            <li
              key={order.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[order.status]}`}>
                      {order.status.toLowerCase().replace("_", " ")}
                    </span>
                    <span className="font-medium">#{order.id.slice(-6).toUpperCase()}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Customer:</span>{" "}
                      <span className="font-medium">{order.guestName ?? "Guest"}</span>
                      {order.guestPhone ? <> · {order.guestPhone}</> : null}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Fulfillment:</span>{" "}
                      <span className="font-medium capitalize">{order.fulfillmentType.toLowerCase().replace("_", " ")}</span>
                    </p>
                    {order.deliveryAddress && (
                      <p>
                        <span className="text-muted-foreground">Address:</span> {order.deliveryAddress}
                      </p>
                    )}
                    {order.specialInstructions && (
                      <p className="mt-1 rounded-md bg-muted/40 p-2 text-xs">
                        <span className="text-muted-foreground">Notes:</span>{" "}
                        {order.specialInstructions}
                      </p>
                    )}
                  </div>
                  <ul className="mt-2 space-y-0.5 text-sm">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex justify-between">
                        <span>
                          {item.quantity}× {item.menuItem.name}
                          {item.notes ? ` (${item.notes})` : ""}
                        </span>
                        <span className="text-muted-foreground">
                          KSh {formatKsh(item.unitPrice * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold">KSh {formatKsh(order.total)}</p>
                  {order.paidAt && (
                    <p className="text-xs text-green-700">Paid {new Date(order.paidAt).toLocaleTimeString()}</p>
                  )}
                </div>
              </div>

              {STATUS_FLOW[order.status].length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">Move to:</span>
                  {STATUS_FLOW[order.status].map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      disabled={pendingOrderId !== null}
                      onClick={() => handleStatusChange(order.id, s)}
                    >
                      {pendingOrderId === order.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      {s.toLowerCase().replace("_", " ")}
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
