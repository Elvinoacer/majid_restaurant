"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, MapPin, Store, Utensils, ShieldCheck, CreditCard, Banknote } from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { formatKsh } from "@/lib/whatsapp/order";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [fulfillment, setFulfillment] = useState<FulfillmentType>("DELIVERY");
  const [payment, setPayment] = useState<PaymentMethod>(
    isMpesaConfiguredClient() ? "MPESA" : "CASH",
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:py-20">
        <h2 className="font-display text-xl font-semibold">Nothing to check out</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your cart is empty — add some items first.
        </p>
        <Button asChild className="mt-6">
          <Link href={`/${slug}/menu`}>Browse menu</Link>
        </Button>
      </div>
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
    if (fulfillment === "DINE_IN" && !tableNumber.trim()) {
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
          tableId: null, // Phase 3 will resolve tableId from tableNumber via QR scan
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

        // Clear the cart only after successful submission.
        clear();

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
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <h1 className="mb-5 font-display text-2xl font-bold sm:text-3xl">Checkout</h1>

      {/* Fulfillment */}
      <section className="mb-6 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
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
      <section className="mb-6 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
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
      <section className="mb-6 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
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
      <section className="mb-6 rounded-xl border border-border bg-muted/30 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Order summary
        </h2>
        <ul className="space-y-1 text-sm">
          {lines.map((l) => (
            <li key={l.menuItemId} className="flex justify-between">
              <span className="truncate pr-2">
                {l.quantity}× {l.name}
              </span>
              <span className="font-medium">KSh {formatKsh(l.unitPrice * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3">
          <span className="font-semibold">Total</span>
          <span className="font-display text-xl font-bold">KSh {formatKsh(total)}</span>
        </div>
      </section>

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
