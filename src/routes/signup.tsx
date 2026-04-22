import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — MatriCare" },
      { name: "description", content: "Sign up for MatriCare with email or phone." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <h1 className="font-display text-3xl font-semibold text-foreground">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Already have one?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>

          <div className="mt-8">
            <EmailSignupForm />
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-[image:var(--gradient-primary)] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,white_0%,transparent_60%)] opacity-15" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2 self-end">
            <Heart className="h-6 w-6" fill="currentColor" />
            <span className="font-display text-2xl font-semibold">MatriCare</span>
          </Link>
          <div>
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Begin your safer<br />pregnancy journey today.
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              Free, private, and powered by clinical-grade AI.
            </p>
          </div>
          <div className="text-sm text-primary-foreground/70">© {new Date().getFullYear()} MatriCare</div>
        </div>
      </div>
    </div>
  );
}

function EmailSignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Signing you in...");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      navigate({ to: "/login" });
      return;
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-[image:var(--gradient-primary)] shadow-[var(--shadow-soft)]">
        {loading ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}

