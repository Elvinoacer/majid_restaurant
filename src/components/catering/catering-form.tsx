"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { createCateringInquiry } from "@/lib/catering/actions";
import { Container } from "@/components/premium/container";
import { PageHeader } from "@/components/premium/page-header";
import { PremiumCard } from "@/components/premium/card";
import { EmptyState } from "@/components/premium/empty-state";

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
      <Container size="narrow" className="py-12 sm:py-20">
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
      </Container>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Container size="narrow" className="py-6 sm:py-10">
        <PageHeader
          title="Catering inquiry"
          subtitle="Weddings, corporate events, birthdays, school functions — we cater across Nakuru County. Tell us about your event and we'll be in touch."
        />

        <PremiumCard className="mb-5 p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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

        <PremiumCard className="mb-5 p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
          <div className="mt-4">
            <Label>Budget range (optional)</Label>
            <RadioGroup
              value={budgetRange}
              onValueChange={(v) => setBudgetRange(v)}
              className="mt-2 flex flex-wrap gap-2"
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
                  className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem id={`b-${b}`} value={b} className="sr-only" />
                  {b}
                </Label>
              ))}
            </RadioGroup>
          </div>
          <div className="mt-4">
            <Label>Event type</Label>
            <RadioGroup
              value={eventType}
              onValueChange={(v) => setEventType(v as typeof eventType)}
              className="mt-2 flex flex-wrap gap-2"
            >
              {(["wedding", "corporate", "birthday", "school", "other"] as const).map((t) => (
                <Label
                  key={t}
                  htmlFor={`et-${t}`}
                  className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm capitalize transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem id={`et-${t}`} value={t} className="sr-only" />
                  {t}
                </Label>
              ))}
            </RadioGroup>
          </div>
        </PremiumCard>

        <PremiumCard className="mb-5 p-5">
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

        <Button type="submit" size="lg" className="w-full gap-2" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Utensils className="h-4 w-4" />
              Submit inquiry
            </>
          )}
        </Button>
      </Container>
    </form>
  );
}
