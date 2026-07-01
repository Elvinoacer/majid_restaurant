"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { createReservation } from "@/lib/reservations/actions";

export function ReservationForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [reservedFor, setReservedFor] = useState("");
  const [occasion, setOccasion] = useState<"birthday" | "anniversary" | "business" | "casual" | "other" | "">("");
  const [seatingPref, setSeatingPref] = useState<"indoor" | "outdoor" | "no preference">("no preference");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestPhone.trim() || !reservedFor) {
      toast.error("Please fill in your name, phone, and reservation time");
      return;
    }
    const party = parseInt(partySize, 10);
    if (Number.isNaN(party) || party < 1 || party > 50) {
      toast.error("Party size must be between 1 and 50");
      return;
    }
    if (new Date(reservedFor).getTime() < Date.now() - 60_000) {
      toast.error("Reservation time must be in the future");
      return;
    }

    startTransition(async () => {
      const result = await createReservation({
        guestName,
        guestPhone,
        partySize: party,
        reservedFor,
        occasion: occasion || null,
        seatingPref,
        notes: notes.trim() || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Reservation requested! We'll confirm via SMS.");
      setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center sm:py-20">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <h2 className="mt-4 font-display text-xl font-semibold">Reservation requested!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll call or SMS you on <strong>{guestPhone}</strong> to confirm.
          If you don&apos;t hear from us within an hour, please call the restaurant directly.
        </p>
        <Button className="mt-6" onClick={() => router.push(`/${slug}`)}>
          Back to home
        </Button>
      </div>
    );
  }

  // Default reservedFor to 2 hours from now rounded to the next 30-min slot.
  const defaultTime = (() => {
    const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
    d.setMinutes(d.getMinutes() >= 30 ? 60 : 30, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Reserve a table</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us when you&apos;re coming — we&apos;ll have your table ready.
        </p>
      </header>

      <section className="mb-5 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="0712 345 678"
              required
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="party">Party size</Label>
            <Input
              id="party"
              type="number"
              min={1}
              max={50}
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="when">When</Label>
            <Input
              id="when"
              type="datetime-local"
              value={reservedFor || defaultTime}
              onChange={(e) => setReservedFor(e.target.value)}
              required
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-xl border border-border bg-card p-4 sm:p-5">
        <Label>Occasion (optional)</Label>
        <RadioGroup
          value={occasion}
          onValueChange={(v) => setOccasion(v as typeof occasion)}
          className="mt-2 flex flex-wrap gap-2"
        >
          {(["birthday", "anniversary", "business", "casual", "other"] as const).map((o) => (
            <Label
              key={o}
              htmlFor={`oc-${o}`}
              className="cursor-pointer rounded-full border border-border px-3 py-1 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <RadioGroupItem id={`oc-${o}`} value={o} className="sr-only" />
              {o.charAt(0).toUpperCase() + o.slice(1)}
            </Label>
          ))}
        </RadioGroup>

        <Label className="mt-4 block">Seating preference</Label>
        <RadioGroup
          value={seatingPref}
          onValueChange={(v) => setSeatingPref(v as typeof seatingPref)}
          className="mt-2 flex flex-wrap gap-2"
        >
          {(["indoor", "outdoor", "no preference"] as const).map((s) => (
            <Label
              key={s}
              htmlFor={`sp-${s}`}
              className="cursor-pointer rounded-full border border-border px-3 py-1 text-sm capitalize has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <RadioGroupItem id={`sp-${s}`} value={s} className="sr-only" />
              {s}
            </Label>
          ))}
        </RadioGroup>
      </section>

      <section className="mb-5 rounded-xl border border-border bg-card p-4 sm:p-5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. high chair needed, near the window, surprise birthday"
          className="mt-1"
        />
      </section>

      <Button type="submit" size="lg" className="w-full gap-2" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Requesting…
          </>
        ) : (
          <>
            <Calendar className="h-4 w-4" />
            Request reservation
          </>
        )}
      </Button>
    </form>
  );
}
