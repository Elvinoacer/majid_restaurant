"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Briefcase, FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createJobApplication } from "@/lib/careers/actions";

type JobPosting = {
  id: string;
  title: string;
  description: string;
  postedAt: string;
};

type Props = {
  slug: string;
  restaurantName: string;
  postings: JobPosting[];
};

export function CareersList({ slug, restaurantName, postings }: Props) {
  const [activePostingId, setActivePostingId] = useState<string | null>(null);

  const activePosting = postings.find((p) => p.id === activePostingId);

  if (postings.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:py-20">
        <Briefcase className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 font-display text-xl font-semibold">No open positions right now</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {restaurantName} isn&apos;t actively hiring at the moment. Please check
          back later — openings will be posted here.
        </p>
      </div>
    );
  }

  if (activePosting) {
    return (
      <JobApplicationForm
        slug={slug}
        posting={activePosting}
        restaurantName={restaurantName}
        onBack={() => setActivePostingId(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Careers at {restaurantName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Join the team. We&apos;re always looking for people who care about
          food, hospitality, and Nakuru.
        </p>
      </header>

      <ul className="space-y-3">
        {postings.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-lg font-semibold">{p.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Posted {new Date(p.postedAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="mt-3 whitespace-pre-line text-sm text-foreground/90 line-clamp-4">
                  {p.description}
                </p>
              </div>
              <Button size="sm" onClick={() => setActivePostingId(p.id)}>
                Apply now
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function JobApplicationForm({
  slug,
  posting,
  restaurantName,
  onBack,
}: {
  slug: string;
  posting: JobPosting;
  restaurantName: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim() || !applicantPhone.trim()) {
      toast.error("Please enter your name and phone number");
      return;
    }

    startTransition(async () => {
      const result = await createJobApplication(
        {
          jobPostingId: posting.id,
          applicantName,
          applicantPhone,
          applicantEmail: applicantEmail || "",
        },
        cvFile,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Application submitted! We'll be in touch.");
      setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center sm:py-20">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <h2 className="mt-4 font-display text-xl font-semibold">Application sent!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Thanks for applying to {posting.title} at {restaurantName}. If your
          profile matches what we&apos;re looking for, we&apos;ll call you on{" "}
          <strong>{applicantPhone}</strong> within 7 working days.
        </p>
        <Button className="mt-6" onClick={() => router.push(`/${slug}`)}>
          Back to home
        </Button>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setCvFile(f);
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        ← All open positions
      </button>

      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{posting.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{restaurantName}</p>
      </header>

      <section className="mb-5 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          About the role
        </h2>
        <p className="whitespace-pre-line text-sm text-foreground/90">
          {posting.description}
        </p>
      </section>

      <section className="mb-5 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Your details
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="aname">Name</Label>
            <Input id="aname" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="aphone">Phone</Label>
            <Input id="aphone" value={applicantPhone} onChange={(e) => setApplicantPhone(e.target.value)} placeholder="0712 345 678" required className="mt-1" />
          </div>
        </div>
        <div className="mt-3">
          <Label htmlFor="aemail">Email (optional)</Label>
          <Input id="aemail" type="email" value={applicantEmail} onChange={(e) => setApplicantEmail(e.target.value)} className="mt-1" />
        </div>
      </section>

      <section className="mb-5 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          CV / Resume
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          PDF or Word document, max 5 MB. Optional but recommended.
        </p>
        <label
          htmlFor="cvfile"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 text-sm font-medium text-foreground/80 hover:bg-muted/50"
        >
          <FileUp className="h-4 w-4" />
          {cvFile ? cvFile.name : "Choose a file"}
          {cvFile && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setCvFile(null);
                const input = document.getElementById("cvfile") as HTMLInputElement | null;
                if (input) input.value = "";
              }}
              className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30"
              aria-label="Remove file"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </label>
        <input
          id="cvfile"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          className="sr-only"
        />
      </section>

      <Button type="submit" size="lg" className="w-full gap-2" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            Submit application
          </>
        )}
      </Button>
    </form>
  );
}
