"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Flame,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Store,
  Utensils,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateOrderStatus } from "@/lib/orders/actions";
import type { FulfillmentType, OrderStatus, StaffRole } from "@/generated/prisma/client";

type KitchenOrder = {
  id: string;
  status: "PREPARING" | "READY" | "DELIVERED";
  fulfillmentType: FulfillmentType;
  total: number;
  guestName: string | null;
  guestPhone: string | null;
  deliveryAddress: string | null;
  specialInstructions: string | null;
  createdAt: string;
  scheduledFor: string | null;
  tableLabel: string | null;
  items: Array<{
    id: string;
    quantity: number;
    notes: string | null;
    name: string;
  }>;
};

type Props = {
  slug: string;
  restaurantId: string;
  restaurantName: string;
  staffRole: StaffRole;
  initialOrders: KitchenOrder[];
  socketUrl: string;
};

/**
 * PRD §5.16 — Kitchen Dashboard.
 *
 * Three columns: Preparing / Ready / Delivered. Designed for a tablet
 * mounted in a kitchen — large touch targets (44px+ per PRD §6), big text,
 * minimal chrome, visual urgency cues.
 *
 * Live updates: if `socketUrl` is set, opens a Socket.IO connection to the
 * external service and re-fetches the order list on every event. Always
 * falls back to 15-second polling as a safety net (mobile connections drop
 * sockets all the time).
 *
 * Role gating: KITCHEN / MANAGER / OWNER can advance order status. Front
 * of house can view but not modify (they handle pickup/delivery handoff
 * verbally).
 */
export function AdminKitchenDashboard({
  slug,
  restaurantId,
  restaurantName,
  staffRole,
  initialOrders,
  socketUrl,
}: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders);
  const [pending, startTransition] = useTransition();
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [now, setNow] = useState<Date>(new Date());

  const canModify = staffRole === "KITCHEN" || staffRole === "MANAGER" || staffRole === "OWNER";

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/${slug}/admin/kitchen/api`, {
        cache: "no-store",
        headers: { "x-restaurant-slug": slug },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { orders: KitchenOrder[] };
      setOrders(data.orders);
      setLastUpdate(new Date());
    } catch {
      // Silent — the polling will retry.
    }
  }, [slug]);

  // Tick `now` every 30s so elapsed-time displays stay current without
  // re-rendering the whole list.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Socket.IO live updates — best-effort. Falls back to polling.
  // Use a typed Socket reference (no `any`) and allow both websocket and
  // polling transports so the connection degrades gracefully on networks
  // that block websockets (corporate Wi-Fi, some mobile carriers).
  useEffect(() => {
    if (!socketUrl) return;
    type Socket = { on: (e: string, cb: (...a: unknown[]) => void) => void; emit: (e: string, ...a: unknown[]) => void; close: () => void };
    let socket: Socket | null = null;
    let cancelled = false;

    (async () => {
      try {
        const mod = await import("socket.io-client");
        const io = mod.io ?? mod.default;
        socket = io(socketUrl, {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionDelay: 1000,
        }) as unknown as Socket;
        socket.on("connect", () => {
          if (cancelled) return;
          socket?.emit("join", `restaurant:${restaurantId}`);
          setSocketConnected(true);
        });
        socket.on("disconnect", () => setSocketConnected(false));
        socket.on("order:new", () => {
          if (cancelled) return;
          refresh();
        });
        socket.on("order:status_changed", () => {
          if (cancelled) return;
          refresh();
        });
        socket.on("connect_error", () => setSocketConnected(false));
      } catch {
        // socket.io-client not installed or socket service down — fall back to polling.
        setSocketConnected(false);
      }
    })();

    return () => {
      cancelled = true;
      if (socket) socket.close();
    };
  }, [socketUrl, restaurantId, refresh]);

  // Always poll every 15s as a safety net — mobile connections drop sockets
  // all the time and the kitchen can't afford to miss an order.
  useEffect(() => {
    const t = setInterval(refresh, 15_000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    // Capture the previous status so we can roll back the optimistic update
    // if the server rejects the change (race condition, permission revoked,
    // etc.). Without this the card stays in the wrong column until the next
    // 15s poll, and kitchen staff may double-act on it.
    const previousOrder = orders.find((o) => o.id === orderId);
    const previousStatus = previousOrder?.status;

    // Optimistic local update so the card moves columns immediately.
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: newStatus as KitchenOrder["status"] } : o,
      ),
    );

    startTransition(async () => {
      const result = await updateOrderStatus({ orderId, status: newStatus });
      if (!result.ok) {
        toast.error(result.error);
        // Roll back the optimistic move.
        if (previousStatus) {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === orderId ? { ...o, status: previousStatus } : o,
            ),
          );
        }
        return;
      }
      router.refresh();
    });
  };

  const preparing = orders.filter((o) => o.status === "PREPARING");
  const ready = orders.filter((o) => o.status === "READY");
  const delivered = orders.filter((o) => o.status === "DELIVERED");

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      {/* Top bar */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Kitchen
            <span className="ml-3 text-sm font-normal text-muted-foreground">
              {restaurantName}
            </span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Live order queue · updated {formatRelative(lastUpdate, now)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              socketUrl
                ? socketConnected
                  ? "bg-success-muted text-success"
                  : "bg-warning-muted text-warning-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {socketUrl ? (
              socketConnected ? (
                <>
                  <Wifi className="h-3 w-3" /> Live
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" /> Polling
                </>
              )
            ) : (
              <>
                <RefreshCw className="h-3 w-3" /> Polling (no socket)
              </>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={pending}
            className="gap-1.5"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>
      </header>

      {/* Three columns */}
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-3">
        <KitchenColumn
          title="Preparing"
          icon={<Flame className="h-5 w-5" />}
          tone="orange"
          orders={preparing}
          now={now}
          canModify={canModify}
          emptyMessage="No orders being prepared."
          onAdvance={(o) => handleStatusChange(o.id, "READY")}
          advanceLabel="Mark ready"
          advanceIcon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KitchenColumn
          title="Ready"
          icon={<Utensils className="h-5 w-5" />}
          tone="green"
          orders={ready}
          now={now}
          canModify={canModify}
          emptyMessage="Nothing waiting for pickup."
          onAdvance={(o) => handleStatusChange(o.id, "DELIVERED")}
          advanceLabel="Mark served"
          advanceIcon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KitchenColumn
          title="Served"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="muted"
          orders={delivered}
          now={now}
          canModify={canModify}
          emptyMessage="No recently served orders."
          onAdvance={(o) => handleStatusChange(o.id, "COMPLETED")}
          advanceLabel="Complete"
          advanceIcon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}

type ColumnTone = "orange" | "green" | "muted";

const TONE_STYLES: Record<ColumnTone, { header: string; count: string }> = {
  orange: {
    header: "border-warning/40 bg-warning-muted/50",
    count: "bg-warning text-warning-foreground",
  },
  green: {
    header: "border-success/40 bg-success-muted/50",
    count: "bg-success text-success-foreground",
  },
  muted: {
    header: "border-border bg-muted/40",
    count: "bg-muted-foreground text-background",
  },
};

function KitchenColumn({
  title,
  icon,
  tone,
  orders,
  now,
  canModify,
  emptyMessage,
  onAdvance,
  advanceLabel,
  advanceIcon,
}: {
  title: string;
  icon: React.ReactNode;
  tone: ColumnTone;
  orders: KitchenOrder[];
  now: Date;
  canModify: boolean;
  emptyMessage: string;
  onAdvance: (order: KitchenOrder) => void;
  advanceLabel: string;
  advanceIcon: React.ReactNode;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-border bg-card">
      <header
        className={cn(
          "flex items-center justify-between rounded-t-xl border-b px-4 py-3",
          styles.header,
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-foreground">{icon}</span>
          <h2 className="font-display text-base font-bold uppercase tracking-wide">
            {title}
          </h2>
        </div>
        <span
          className={cn(
            "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-bold",
            styles.count,
          )}
        >
          {orders.length}
        </span>
      </header>
      <div className="flex-1 overflow-y-auto p-3">
        {orders.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <KitchenOrderCard
                key={o.id}
                order={o}
                now={now}
                canModify={canModify}
                onAdvance={onAdvance}
                advanceLabel={advanceLabel}
                advanceIcon={advanceIcon}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function KitchenOrderCard({
  order,
  now,
  canModify,
  onAdvance,
  advanceLabel,
  advanceIcon,
}: {
  order: KitchenOrder;
  now: Date;
  canModify: boolean;
  onAdvance: (order: KitchenOrder) => void;
  advanceLabel: string;
  advanceIcon: React.ReactNode;
}) {
  const elapsedMs = now.getTime() - new Date(order.createdAt).getTime();
  const elapsedMin = Math.floor(elapsedMs / 60_000);
  // Urgency cue per PRD §5.16: "elapsed time since order placed (visual urgency
  // cue past a configurable threshold)". 10 minutes for Preparing, 5 for Ready.
  const isUrgent =
    (order.status === "PREPARING" && elapsedMin >= 10) ||
    (order.status === "READY" && elapsedMin >= 5);

  const isScheduled = order.scheduledFor && new Date(order.scheduledFor).getTime() > Date.now();

  return (
    <li
      className={cn(
        "rounded-xl border-2 bg-background p-3 elevation-1",
        isUrgent
          ? "border-danger ring-2 ring-danger-muted"
          : "border-border",
      )}
    >
      {/* Header: order #, elapsed time, fulfillment */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-bold">
            #{order.id.slice(-6).toUpperCase()}
          </span>
          {isScheduled && (
            <span className="rounded-full bg-info-muted px-2 py-0.5 text-[10px] font-semibold text-info">
              SCHEDULED
            </span>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold",
            isUrgent ? "text-danger" : "text-muted-foreground",
          )}
        >
          <Clock className="h-3 w-3" />
          {elapsedMin}m
        </span>
      </div>

      {/* Fulfillment + table/address */}
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
          {fulfillmentIcon(order.fulfillmentType)}
          {fulfillmentLabel(order.fulfillmentType)}
        </span>
        {order.tableLabel && (
          <span className="inline-flex items-center gap-1">
            <Utensils className="h-3 w-3" />
            {order.tableLabel}
          </span>
        )}
        {order.deliveryAddress && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{order.deliveryAddress}</span>
          </span>
        )}
      </div>

      {/* Items */}
      <ul className="mt-3 space-y-1.5">
        {order.items.map((it) => (
          <li key={it.id} className="text-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-base font-bold text-primary">
                {it.quantity}×
              </span>
              <span className="font-medium">{it.name}</span>
            </div>
            {it.notes && (
              <p className="ml-6 text-xs text-warning-foreground">↳ {it.notes}</p>
            )}
          </li>
        ))}
      </ul>

      {/* Special instructions */}
      {order.specialInstructions && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-warning-muted p-2 text-xs text-warning-foreground">
          <MessageSquare className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <span>{order.specialInstructions}</span>
        </div>
      )}

      {/* Scheduled-for hint */}
      {isScheduled && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-info">
          <Clock className="h-3 w-3" />
          Fire at {new Date(order.scheduledFor!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}

      {/* Customer contact (small, for delivery drivers) */}
      <div className="mt-2 text-[11px] text-muted-foreground">
        {order.guestName ?? "Guest"}
        {order.guestPhone ? <> · {order.guestPhone}</> : null}
      </div>

      {/* Action button — large touch target */}
      {canModify && (
        <Button
          size="lg"
          className="mt-3 h-12 w-full gap-2 text-base font-semibold"
          onClick={() => onAdvance(order)}
        >
          {advanceIcon}
          {advanceLabel}
        </Button>
      )}
      {!canModify && (
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Read-only — kitchen staff advance orders.
        </p>
      )}
    </li>
  );
}

function fulfillmentLabel(t: FulfillmentType): string {
  return t.toLowerCase().replace("_", " ");
}

function fulfillmentIcon(t: FulfillmentType): React.ReactNode {
  if (t === "DELIVERY") return <MapPin className="h-3 w-3" />;
  if (t === "PICKUP") return <Store className="h-3 w-3" />;
  return <Utensils className="h-3 w-3" />;
}

function formatRelative(d: Date, now: Date): string {
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return d.toLocaleTimeString();
}
