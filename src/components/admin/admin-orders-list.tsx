"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatKsh } from "@/lib/whatsapp/order";
import { updateOrderStatus } from "@/lib/orders/actions";
import type { OrderStatus, FulfillmentType } from "@/generated/prisma/client";
import { PageHeader } from "@/components/premium/page-header";
import { SearchInput } from "@/components/premium/search-input";
import { Pagination } from "@/components/premium/pagination";
import { EmptyState } from "@/components/premium/empty-state";
import { StatusPill, type StatusTone } from "@/components/premium/status-pill";
import { PremiumCard } from "@/components/premium/card";

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

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  DRAFT: "neutral",
  PENDING_PAYMENT: "warning",
  CONFIRMED: "info",
  PREPARING: "warning",
  READY: "success",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

const PAGE_SIZE = 10;

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
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Filter + search + paginate — all client-side since orders are passed in.
  const filtered = useMemo(() => {
    let list = initialOrders;
    if (filter !== "all") {
      list =
        filter === "active"
          ? list.filter((o) => !["COMPLETED", "CANCELLED", "DRAFT"].includes(o.status))
          : list.filter((o) => o.status === filter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.guestName?.toLowerCase().includes(q) ?? false) ||
          (o.guestPhone?.toLowerCase().includes(q) ?? false) ||
          (o.deliveryAddress?.toLowerCase().includes(q) ?? false) ||
          o.items.some((it) => it.menuItem.name.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [initialOrders, filter, query]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

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
      <PageHeader
        title="Orders"
        subtitle={`${total} order${total === 1 ? "" : "s"} ${filter === "active" ? "active" : "total"}`}
        actions={
          <Select value={filter} onValueChange={(v) => { setFilter(v as typeof filter); setPage(1); }}>
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
        }
      />

      <div className="mb-4">
        <SearchInput
          value={query}
          onChange={(v) => { setQuery(v); setPage(1); }}
          placeholder="Search by order #, name, phone, or dish…"
          ariaLabel="Search orders"
        />
      </div>

      {paged.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7" />}
          title={query ? "No matching orders" : "No orders here yet"}
          description={
            query
              ? "Try a different search term or clear your filters."
              : "Orders will appear here as customers place them."
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {paged.map((order) => (
              <li key={order.id}>
                <PremiumCard className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={STATUS_TONE[order.status]}>
                          {order.status.toLowerCase().replace("_", " ")}
                        </StatusPill>
                        <span className="font-display font-bold tabular-nums text-foreground">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
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
                          <span className="font-medium capitalize">
                            {order.fulfillmentType.toLowerCase().replace("_", " ")}
                          </span>
                        </p>
                        {order.deliveryAddress && (
                          <p>
                            <span className="text-muted-foreground">Address:</span>{" "}
                            {order.deliveryAddress}
                          </p>
                        )}
                        {order.specialInstructions && (
                          <p className="mt-1.5 rounded-lg bg-muted/40 p-2 text-xs">
                            <span className="text-muted-foreground">Notes:</span>{" "}
                            {order.specialInstructions}
                          </p>
                        )}
                      </div>
                      <ul className="mt-2.5 space-y-0.5 text-sm">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex justify-between gap-2">
                            <span className="truncate">
                              <span className="font-medium tabular-nums">{item.quantity}×</span>{" "}
                              {item.menuItem.name}
                              {item.notes ? ` (${item.notes})` : ""}
                            </span>
                            <span className="font-medium tabular-nums text-muted-foreground">
                              KSh {formatKsh(item.unitPrice * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold tabular-nums">
                        <span className="text-xs font-normal text-muted-foreground">KSh </span>
                        {formatKsh(order.total)}
                      </p>
                      {order.paidAt && (
                        <p className="text-xs text-success">
                          Paid {new Date(order.paidAt).toLocaleTimeString()}
                        </p>
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
                          {pendingOrderId === order.id && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          {s.toLowerCase().replace("_", " ")}
                        </Button>
                      ))}
                    </div>
                  )}
                </PremiumCard>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <Pagination
              page={currentPage}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
