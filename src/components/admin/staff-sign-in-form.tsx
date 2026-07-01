"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { staffLoginAction } from "@/lib/auth/staff-actions";

export function StaffSignInForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await staffLoginAction(email, password);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Signed in");
      router.refresh();
      router.push(`/${slug}/admin`);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-12 max-w-sm rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-xl font-bold">Staff sign in</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Access the admin dashboard
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1"
          />
        </div>
      </div>

      <Button type="submit" className="mt-5 w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
      </Button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Demo: owner@majid.com / majid-owner-2024
      </p>
    </form>
  );
}
