"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, MapPin, Store, Utensils, ShieldCheck, CreditCard, Banknote, Check, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { formatKsh } from "@/lib/whatsapp/order";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Container } from "@/components/premium/container";
import { PageHeader } from "@/components/premium/page-header";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumCard } from "@/components/premium/card";
import {
  createOrderFromCart,
  submitOrder,
  type CreateOrderInput,
} from "@/lib/orders/actions";
import { isMpesaConfiguredClient } from "@/lib/mpesa/client";

type FulfillmentType = "DELIVERY" | "PICKUP" | "DINE_IN";
type PaymentMethod = "MPESA" | "CASH";

export function CheckoutView({ slug }: { slug: string }) {
  const lines = useCart((s) => s.lines);
  const total = useCart((s) => s.total());
  const clear = useCart((s) => s.clear);
  const cartTableId = useCart((s) => s.tableId);
  const cartTableLabel = useCart((s) => s.tableLabel);
  const clearTable = useCart((s) => s.clearTable);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Pre-select DINE_IN if the customer scanned a table QR; the table field
  // is shown read-only since it's already known.
  const [fulfillment, setFulfillment] = useState<FulfillmentType>(
    cartTableId ? "DINE_IN" : "DELIVERY",
  );
  const [payment, setPayment] = useState<PaymentMethod>(
    isMpesaConfiguredClient() ? "MPESA" : "CASH",
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tableNumber, setTableNumber] = useState(cartTableLabel ?? "");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");

  if (lines.length === 0) {
    return (
      <Container size="narrow" className="py-12 sm:py-20">
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7" />}
          title="Nothing to check out"
          description="Your cart is empty — add some items from the menu first."
          action={
            <Button asChild>
              <Link href={`/${slug}/menu`}>Browse menu</Link>
            </Button>
          }
        />
      </Container>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Please enter your name and phone number");
      return;
    }
    if (fulfillment === "DELIVERY" && !address.trim()) {
      toast.error("Please enter your delivery address");
      return;
    }
    if (fulfillment === "DINE_IN" && !cartTableId && !tableNumber.trim()) {
      toast.error("Please enter your table number");
      return;
    }
    if (payment === "MPESA" && !mpesaPhone.trim()) {
      toast.error("Please enter the M-Pesa phone number to charge");
      return;
    }

    startTransition(async () => {
      try {
        const input: CreateOrderInput = {
          lines: lines.map((l) => ({
            menuItemId: l.menuItemId,
            name: l.name,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            notes: l.notes ?? null,
          })),
          fulfillmentType: fulfillment,
          scheduledFor: scheduledFor || null,
          deliveryAddress: fulfillment === "DELIVERY" ? address : null,
          // Phase 3: if the customer scanned a table QR, pass the resolved
          // tableId straight through — the server validates it belongs to this
          // tenant. Manual table number entry falls back to null (Phase 3
          // staff can still match it to a table by label).
          tableId: fulfillment === "DINE_IN" ? cartTableId ?? null : null,
          specialInstructions: specialInstructions || null,
          guestName: name,
          guestPhone: phone,
        };

        const created = await createOrderFromCart(input);
        if (!created.ok) {
          toast.error(created.error);
          return;
        }

        const submitted = await submitOrder({
          orderId: created.data.orderId,
          paymentMethod: payment,
          mpesaPhone: payment === "MPESA" ? mpesaPhone : undefined,
        });
        if (!submitted.ok) {
          toast.error(submitted.error);
          return;
        }

        // Clear the cart + table after successful submission.
        clear();
        if (cartTableId) clearTable();

        if (submitted.data.status === "CONFIRMED") {
          toast.success("Order placed! The kitchen has been notified.");
          router.push(`/${slug}/orders/${created.data.orderId}`);
        } else if (submitted.data.status === "PENDING_PAYMENT") {
          toast.success("Enter your M-Pesa PIN on your phone to complete payment.");
          router.push(`/${slug}/orders/${created.data.orderId}?pending=mpesa`);
        }
      } catch (e) {
        toast.error((e as Error).message || "Checkout failed");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Container size="default" className="py-6 sm:py-10">
        <PageHeader
          title="Checkout"
          subtitle="Review your order and choose how you'd like it."
        />

      {/* Fulfillment */}
      <PremiumCard className="mb-6 p-4 sm:p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          How would you like your order?
        </h2>
        <RadioGroup
          value={fulfillment}
          onValueChange={(v) => setFulfillment(v as FulfillmentType)}
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          <FulfillmentOption
            value="DELIVERY"
            label="Delivery"
            description="We bring it to you"
            icon={<MapPin className="h-4 w-4" />}
            selected={fulfillment === "DELIVERY"}
          />
          <FulfillmentOption
            value="PICKUP"
            label="Pickup"
            description="You pick it up"
            icon={<Store className="h-4 w-4" />}
            selected={fulfillment === "PICKUP"}
          />
          <FulfillmentOption
            value="DINE_IN"
            label="Dine-in"
            description="Eat here"
            icon={<Utensils className="h-4 w-4" />}
            selected={fulfillment === "DINE_IN"}
          />
        </RadioGroup>

        {fulfillment === "DELIVERY" && (
          <div className="mt-4">
            <Label htmlFor="address">Delivery address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. House 12, Section 58, near Nakuru Athletics Club"
              required
              className="mt-1"
            />
          </div>
        )}

        {fulfillment === "DINE_IN" && (
          <div className="mt-4">
            <Label htmlFor="table">Table number</Label>
            {cartTableId && cartTableLabel ? (
              <div className="mt-1">
                <Input
                  id="table"
                  value={cartTableLabel}
                  readOnly
                  className="bg-muted/40 font-medium"
                />
                <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
                  <Check className="h-3 w-3" />
                  Detected from QR code on your table.
                </p>
              </div>
            ) : (
              <>
                <Input
                  id="table"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. Table 4"
                  required
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Find the table number on the QR card on your table.
                </p>
              </>
            )}
          </div>
        )}

        <div className="mt-4">
          <Label htmlFor="scheduled">Scheduled time (optional)</Label>
          <Input
            id="scheduled"
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Leave blank for "as soon as possible".
          </p>
        </div>
      </section>

      {/* Contact */}
      <PremiumCard className="mb-6 p-4 sm:p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Your contact details
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1"
              placeholder="Aisha M."
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="mt-1"
              placeholder="0712 345 678"
            />
          </div>
        </div>
        <div className="mt-3">
          <Label htmlFor="notes">Special instructions (optional)</Label>
          <Textarea
            id="notes"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="e.g. extra spicy, no onions, call on arrival"
            className="mt-1"
          />
        </div>
      </section>

      {/* Payment */}
      <PremiumCard className="mb-6 p-4 sm:p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Payment method
        </h2>
        <RadioGroup
          value={payment}
          onValueChange={(v) => setPayment(v as PaymentMethod)}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          <PaymentOption
            value="MPESA"
            label="M-Pesa"
            description="Pay via STK Push"
            icon={<CreditCard className="h-4 w-4" />}
            selected={payment === "MPESA"}
            disabled={!isMpesaConfiguredClient()}
            disabledNote={!isMpesaConfiguredClient() ? "M-Pesa not configured for this demo" : undefined}
          />
          <PaymentOption
            value="CASH"
            label="Cash"
            description={fulfillment === "DELIVERY" ? "Pay on delivery" : "Pay on pickup"}
            icon={<Banknote className="h-4 w-4" />}
            selected={payment === "CASH"}
          />
        </RadioGroup>

        {payment === "MPESA" && (
          <div className="mt-4">
            <Label htmlFor="mpesaPhone">M-Pesa phone number</Label>
            <Input
              id="mpesaPhone"
              value={mpesaPhone}
              onChange={(e) => setMpesaPhone(e.target.value)}
              placeholder="0712 345 678"
              required
              className="mt-1"
            />
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3 w-3" />
              You'll get a prompt on this phone to enter your M-Pesa PIN.
            </p>
          </div>
        )}
      </section>

      {/* Summary */}
      <PremiumCard className="mb-6 bg-muted/30 p-4 sm:p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Order summary
        </h2>
        <ul className="space-y-1.5 text-sm">
          {lines.map((l) => (
            <li key={l.menuItemId} className="flex justify-between gap-2">
              <span className="truncate text-foreground/80">
                <span className="font-medium tabular-nums text-foreground">{l.quantity}×</span>{" "}
                {l.name}
              </span>
              <span className="font-medium tabular-nums">KSh {formatKsh(l.unitPrice * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3">
          <span className="font-semibold">Total</span>
          <span className="font-display text-xl font-bold tabular-nums">
            <span className="text-sm font-normal text-muted-foreground">KSh </span>
            {formatKsh(total)}
          </span>
        </div>
      </PremiumCard>

      <Button type="submit" size="lg" className="w-full gap-2" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Placing order…
          </>
        ) : (
          <>
            Place order · KSh {formatKsh(total)}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        By placing this order you agree to be contacted by the restaurant about
        your order.
      </p>
      </Container>
    </form>
  );
}

function FulfillmentOption({
  value,
  label,
  description,
  icon,
  selected,
}: {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
}) {
  return (
    <Label
      htmlFor={`f-${value}`}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent/5",
      )}
    >
      <RadioGroupItem value={value} id={`f-${value}`} className="mt-0.5" />
      <div className="flex-1">
        <div className="flex items-center gap-1.5 font-medium">
          {icon}
          {label}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Label>
  );
}

function PaymentOption({
  value,
  label,
  description,
  icon,
  selected,
  disabled,
  disabledNote,
}: {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  disabled?: boolean;
  disabledNote?: string;
}) {
  return (
    <Label
      htmlFor={`p-${value}`}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        disabled && "cursor-not-allowed opacity-60",
        !disabled && "cursor-pointer",
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent/5",
      )}
    >
      <RadioGroupItem value={value} id={`p-${value}`} className="mt-0.5" disabled={disabled} />
      <div className="flex-1">
        <div className="flex items-center gap-1.5 font-medium">
          {icon}
          {label}
        </div>
        <p className="text-xs text-muted-foreground">{disabledNote ?? description}</p>
      </div>
    </Label>
  );
}
