import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Birthday Twin" },
      { name: "description", content: "Create your Birthday Twin account and meet your twins." },
      { property: "og:title", content: "Sign in — Birthday Twin" },
      { property: "og:description", content: "Create your account and meet your Birthday Twins." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const parsed = z.string().trim().email().safeParse(email);
        if (!parsed.success) throw new Error("Enter a valid email");
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("Check your email for a reset link.");
        return;
      }

      const parsed = schema.safeParse({ email, password });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid details");

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setSent("Almost there — confirm your email to start finding your twins.");
          return;
        }
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        navigate({ to: "/home" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in didn't work. Try email instead.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home" });
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-5 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 gradient-glow" />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="flex justify-center">
          <Logo />
        </Link>
        <h1 className="mt-6 text-center font-display text-2xl font-semibold">
          {mode === "signup"
            ? "Find your Birthday Twins"
            : mode === "signin"
              ? "Welcome back"
              : "Reset your password"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {mode === "forgot"
            ? "We'll email you a link to set a new password."
            : "People born on your exact day are already here."}
        </p>

        {sent ? (
          <div className="panel mt-6 p-5 text-center text-sm">
            <p className="text-2xl">📬</p>
            <p className="mt-2">{sent}</p>
            <Button
              variant="ghost"
              className="mt-4 rounded-full"
              onClick={() => {
                setSent(null);
                setMode("signin");
              }}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="panel mt-6 flex flex-col gap-4 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 rounded-xl"
                required
              />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="h-11 rounded-xl"
                  required
                />
              </div>
            )}
            <Button type="submit" disabled={busy} className="h-11 w-full rounded-full">
              {busy
                ? "One moment…"
                : mode === "signup"
                  ? "Create account"
                  : mode === "signin"
                    ? "Sign in"
                    : "Send reset link"}
            </Button>

            {mode !== "forgot" && (
              <>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={google}
                  className="h-11 w-full rounded-full"
                >
                  Continue with Google
                </Button>
              </>
            )}
          </form>
        )}

        {!sent && (
          <div className="mt-5 space-y-2 text-center text-sm text-muted-foreground">
            {mode === "signup" && (
              <p>
                Already here?{" "}
                <button className="font-medium text-primary" onClick={() => setMode("signin")}>
                  Sign in
                </button>
              </p>
            )}
            {mode === "signin" && (
              <>
                <p>
                  New to Birthday Twin?{" "}
                  <button className="font-medium text-primary" onClick={() => setMode("signup")}>
                    Create an account
                  </button>
                </p>
                <p>
                  <button className="text-primary" onClick={() => setMode("forgot")}>
                    Forgot your password?
                  </button>
                </p>
              </>
            )}
            {mode === "forgot" && (
              <p>
                <button className="font-medium text-primary" onClick={() => setMode("signin")}>
                  Back to sign in
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
