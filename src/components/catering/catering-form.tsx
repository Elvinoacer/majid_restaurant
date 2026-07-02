"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  Utensils,
  Users,
  CalendarDays,
  Sparkles,
  Phone,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { createCateringInquiry } from "@/lib/catering/actions";
import { Container } from "@/components/premium/container";
import { PremiumCard } from "@/components/premium/card";
import { EmptyState } from "@/components/premium/empty-state";
import { FadeIn, StaggerContainer, staggerChild, motion } from "@/components/premium/motion";

export function CateringForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("50");
  const [budgetRange, setBudgetRange] = useState("");
  const [preferredCuisine, setPreferredCuisine] = useState("");
  const [eventType, setEventType] = useState<"wedding" | "corporate" | "birthday" | "school" | "other" | "">("");
  const [notes, setNotes] = useState("");

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
    if (new Date(eventDate).getTime() < Date.now() - 24 * 60 * 60 * 1000) {
      toast.error("Event date cannot be in the past");
      return;
    }

    startTransition(async () => {
      const result = await createCateringInquiry({
        contactName,
        contactPhone,
        contactEmail: contactEmail || "",
        eventDate,
        guestCount: guests,
        budgetRange: budgetRange || null,
        preferredCuisine: preferredCuisine || null,
        eventType: eventType || null,
        notes: notes || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Inquiry submitted! We'll be in touch within 24 hours.");
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
            title="Inquiry sent!"
            description={
              <>
                Thanks for thinking of us for your event. Our catering team will call
                you on <strong>{contactPhone}</strong> within 24 hours to discuss
                details and put together a quote.
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
          <div className="mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-brand-saffron/5 to-brand-terracotta/8 p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground elevation-2 sm:h-20 sm:w-20">
                <Utensils className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Catering inquiry
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Weddings, corporate events, birthdays, school functions — we cater
                  across Nakuru County. Tell us about your event and we&apos;ll be in
                  touch.
                </p>
              </div>
            </div>

            {/* Feature pills */}
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { icon: Users, label: "50–500+ guests" },
                { icon: CalendarDays, label: "Flexible scheduling" },
                { icon: Sparkles, label: "Custom menus" },
                { icon: Phone, label: "Response in 24h" },
              ].map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur-sm"
                >
                  <f.icon className="h-3 w-3 text-primary" />
                  {f.label}
                </span>
              ))}
            </div>
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
              <div className="mt-4">
                <Label htmlFor="cemail">Email (optional)</Label>
                <Input id="cemail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="mt-1.5" autoComplete="email" />
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="edate">Event date</Label>
                  <Input id="edate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="gcount">Guest count</Label>
                  <Input id="gcount" type="number" min={1} value={guestCount} onChange={(e) => setGuestCount(e.target.value)} required className="mt-1.5" />
                </div>
              </div>
              <div className="mt-5">
                <Label className="mb-2 block">Budget range (optional)</Label>
                <RadioGroup
                  value={budgetRange}
                  onValueChange={(v) => setBudgetRange(v)}
                  className="flex flex-wrap gap-2"
                >
                  {[
                    "Under KSh 20,000",
                    "KSh 20,000 - 50,000",
                    "KSh 50,000 - 100,000",
                    "KSh 100,000+",
                  ].map((b) => (
                    <Label
                      key={b}
                      htmlFor={`b-${b}`}
                      className="cursor-pointer rounded-full border border-border px-3.5 py-2 text-sm transition-all duration-200 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary has-[:checked]:font-medium hover:bg-muted/50"
                    >
                      <RadioGroupItem id={`b-${b}`} value={b} className="sr-only" />
                      {b}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
              <div className="mt-5">
                <Label className="mb-2 block">Event type</Label>
                <RadioGroup
                  value={eventType}
                  onValueChange={(v) => setEventType(v as typeof eventType)}
                  className="flex flex-wrap gap-2"
                >
                  {(["wedding", "corporate", "birthday", "school", "other"] as const).map((t) => (
                    <Label
                      key={t}
                      htmlFor={`et-${t}`}
                      className="cursor-pointer rounded-full border border-border px-3.5 py-2 text-sm capitalize transition-all duration-200 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary has-[:checked]:font-medium hover:bg-muted/50"
                    >
                      <RadioGroupItem id={`et-${t}`} value={t} className="sr-only" />
                      {t}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </PremiumCard>
          </motion.div>

          {/* Cuisine & notes */}
          <motion.div variants={staggerChild}>
            <PremiumCard className="p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">3</span>
                Preferences
              </h2>
              <Label htmlFor="cuisine">Preferred cuisine / dishes (optional)</Label>
              <Input
                id="cuisine"
                value={preferredCuisine}
                onChange={(e) => setPreferredCuisine(e.target.value)}
                placeholder="e.g. biryani + nyama choma + vegetarian options"
                className="mt-1.5"
              />
              <Label htmlFor="cnotes" className="mt-4 block">Additional notes</Label>
              <Textarea
                id="cnotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. serving staff needed, halal-only, dietary restrictions, setup time"
                className="mt-1.5"
              />
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
                  Submit inquiry
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              We&apos;ll call you within 24 hours to discuss your event.
            </p>
          </motion.div>
        </StaggerContainer>
      </Container>
    </form>
  );
}
