"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createEventBooking } from "@/lib/events/actions";

type Props = {
  slug: string;
  restaurantName: string;
};

export function EventBookingForm({ slug, restaurantName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [durationHours, setDurationHours] = useState("4");
  const [guestCount, setGuestCount] = useState("50");
  const [setupNeeds, setSetupNeeds] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim() || !eventDate) {
      toast.error("Please fill in your name, phone, and event date");
      return;
    }
    const guests = parseInt(guestCount, 10);
    if (Number.isNaN(guests) || guests < 1) {
      toast.error("Please enter a valid guest count");
      return;
    }
    const hours = parseFloat(durationHours);
    if (Number.isNaN(hours) || hours <= 0) {
      toast.error("Please enter a valid duration");
      return;
    }
    if (new Date(eventDate).getTime() < Date.now() - 24 * 60 * 60 * 1000) {
      toast.error("Event date cannot be in the past");
      return;
    }

    startTransition(async () => {
      const result = await createEventBooking({
        contactName,
        contactPhone,
        eventDate,
        durationHours: hours,
        guestCount: guests,
        setupNeeds: setupNeeds || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Booking request submitted! We'll call you within 24 hours.");
      setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center sm:py-20">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <h2 className="mt-4 font-display text-xl font-semibold">Request sent!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Thanks for thinking of {restaurantName} for your event. Our events
          team will call you on <strong>{contactPhone}</strong> within 24 hours
          to discuss availability, setup, and pricing.
        </p>
        <Button className="mt-6" onClick={() => router.push(`/${slug}`)}>
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Event &amp; meeting space
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Host your next event at {restaurantName}. Tell us about your event and
          we&apos;ll be in touch within 24 hours to discuss availability and
          setup.
        </p>
      </header>

      <section className="mb-5 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Your contact details
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="cname">Name</Label>
            <Input id="cname" value={contactName} onChange={(e) => setContactName(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="cphone">Phone</Label>
            <Input id="cphone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="0712 345 678" required className="mt-1" />
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Event details
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="edate">Event date</Label>
            <Input id="edate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="dur">Duration (hours)</Label>
            <Input id="dur" type="number" min={0.5} max={24} step={0.5} value={durationHours} onChange={(e) => setDurationHours(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="gcount">Guest count</Label>
            <Input id="gcount" type="number" min={1} value={guestCount} onChange={(e) => setGuestCount(e.target.value)} required className="mt-1" />
          </div>
        </div>
        <div className="mt-3">
          <Label htmlFor="setup">Setup needs (optional)</Label>
          <Textarea
            id="setup"
            value={setupNeeds}
            onChange={(e) => setSetupNeeds(e.target.value)}
            placeholder="e.g. projector + screen, 10 round tables of 8, PA system, separate buffet area"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Tell us anything we need to know about how you want the space set up.
          </p>
        </div>
      </section>

      <Button type="submit" size="lg" className="w-full gap-2" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <CalendarDays className="h-4 w-4" />
            Submit booking request
          </>
        )}
      </Button>
    </form>
  );
}
