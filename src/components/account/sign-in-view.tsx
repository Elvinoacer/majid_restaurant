"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { customerSignup } from "@/lib/menu/actions";

export function SignInView({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? `/${slug}/account`;
  const [pending, startTransition] = useTransition();

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await signIn("credentials", {
        email: signinEmail,
        password: signinPassword,
        restaurantSlug: slug,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Invalid email or password");
        return;
      }
      toast.success("Signed in");
      router.push(callbackUrl);
      router.refresh();
    });
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await customerSignup({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        phone: signupPhone || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // Auto sign-in after signup.
      const res = await signIn("credentials", {
        email: signupEmail,
        password: signupPassword,
        restaurantSlug: slug,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Account created — please sign in.");
        return;
      }
      toast.success("Account created");
      router.push(callbackUrl);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:py-12">
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Your account</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Sign in to track orders, save your details, and leave reviews.
        Guest checkout is always available — you don&apos;t need an account to order.
      </p>

      <Tabs defaultValue="signin">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">
            <LogIn className="mr-1.5 h-4 w-4" />
            Sign in
          </TabsTrigger>
          <TabsTrigger value="signup">
            <UserPlus className="mr-1.5 h-4 w-4" />
            Create account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <form onSubmit={handleSignIn} className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
            <div>
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                value={signinEmail}
                onChange={(e) => setSigninEmail(e.target.value)}
                required
                className="mt-1"
                placeholder="aisha@example.com"
              />
            </div>
            <div>
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                type="password"
                value={signinPassword}
                onChange={(e) => setSigninPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <form onSubmit={handleSignUp} className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
            <div>
              <Label htmlFor="signup-name">Name</Label>
              <Input
                id="signup-name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="signup-phone">Phone (optional)</Label>
              <Input
                id="signup-phone"
                value={signupPhone}
                onChange={(e) => setSignupPhone(e.target.value)}
                className="mt-1"
                placeholder="0712 345 678"
              />
            </div>
            <div>
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
                className="mt-1"
                placeholder="At least 6 characters"
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Don&apos;t want an account?{" "}
        <Link href={`/${slug}/menu`} className="text-primary underline-offset-2 hover:underline">
          Continue as guest
        </Link>
      </p>
    </div>
  );
}
