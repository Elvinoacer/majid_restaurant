"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  CalendarDays,
  Users,
  Clock,
  Projector,
  Utensils,
  Music,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createEventBooking } from "@/lib/events/actions";
import { Container } from "@/components/premium/container";
import { PremiumCard } from "@/components/premium/card";
import { EmptyState } from "@/components/premium/empty-state";
import { FadeIn, StaggerContainer, staggerChild, motion } from "@/components/premium/motion";

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
      <Container size="narrow" className="py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <EmptyState
            icon={<CheckCircle2 className="h-7 w-7" />}
            title="Request sent!"
            description={
              <>
                Thanks for thinking of {restaurantName} for your event. Our events
                team will call you on <strong>{contactPhone}</strong> within 24 hours
                to discuss availability, setup, and pricing.
              </>
            }
            action={<Button onClick={() => router.push(`/${slug}`)}>Back to home</Button>}
          />
        </motion.div>
      </Container>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Container size="narrow" className="py-8 sm:py-12">
        {/* ── Hero banner ──────────────────────────────────────── */}
        <FadeIn>
          <div className="mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-terracotta/8 via-primary/5 to-brand-saffron/10 p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground elevation-2 sm:h-20 sm:w-20">
                <CalendarDays className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Event &amp; meeting space
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Host your next event at {restaurantName}. Tell us about your event
                  and we&apos;ll be in touch within 24 hours to discuss availability
                  and setup.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ── Venue features ───────────────────────────────────── */}
        <FadeIn delay={0.08}>
          <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Users, label: "Up to 200", sub: "Seated guests" },
              { icon: Projector, label: "AV ready", sub: "Projector & PA" },
              { icon: Utensils, label: "Full catering", sub: "Custom menus" },
              { icon: Music, label: "Entertainment", sub: "DJ/band friendly" },
            ].map((f, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center elevation-1 sm:p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* ── Form cards ───────────────────────────────────────── */}
        <StaggerContainer className="space-y-5">
          {/* Contact details */}
          <motion.div variants={staggerChild}>
            <PremiumCard className="p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">1</span>
                Your contact details
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cname">Name</Label>
                  <Input id="cname" value={contactName} onChange={(e) => setContactName(e.target.value)} required className="mt-1.5" autoComplete="name" />
                </div>
                <div>
                  <Label htmlFor="cphone">Phone</Label>
                  <Input id="cphone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="0712 345 678" required className="mt-1.5" autoComplete="tel" />
                </div>
              </div>
            </PremiumCard>
          </motion.div>

          {/* Event details */}
          <motion.div variants={staggerChild}>
            <PremiumCard className="p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">2</span>
                Event details
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="edate">Event date</Label>
                  <Input id="edate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="dur">Duration (hours)</Label>
                  <Input id="dur" type="number" min={0.5} max={24} step={0.5} value={durationHours} onChange={(e) => setDurationHours(e.target.value)} required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="gcount">Guest count</Label>
                  <Input id="gcount" type="number" min={1} value={guestCount} onChange={(e) => setGuestCount(e.target.value)} required className="mt-1.5" />
                </div>
              </div>
              <div className="mt-5">
                <Label htmlFor="setup">Setup needs (optional)</Label>
                <Textarea
                  id="setup"
                  value={setupNeeds}
                  onChange={(e) => setSetupNeeds(e.target.value)}
                  placeholder="e.g. projector + screen, 10 round tables of 8, PA system, separate buffet area"
                  className="mt-1.5"
                />
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Tell us anything we need to know about how you want the space set up.
                </p>
              </div>
            </PremiumCard>
          </motion.div>

          {/* Submit */}
          <motion.div variants={staggerChild}>
            <Button type="submit" size="lg" className="w-full gap-2 text-base" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  Submit booking request
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Our events team will call you within 24 hours to confirm availability.
            </p>
          </motion.div>
        </StaggerContainer>
      </Container>
    </form>
  );
}
