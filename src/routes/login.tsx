import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Mail, Phone, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — MatriCare" },
      { name: "description", content: "Sign in to MatriCare with email or phone." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[image:var(--gradient-primary)] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white_0%,transparent_60%)] opacity-15" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6" fill="currentColor" />
            <span className="font-display text-2xl font-semibold">MatriCare</span>
          </Link>
          <div>
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Welcome back.<br />Continue your journey to safer care.
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              AI-powered maternal health, always by your side.
            </p>
          </div>
          <div className="text-sm text-primary-foreground/70">
            © {new Date().getFullYear()} MatriCare
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <h1 className="font-display text-3xl font-semibold text-foreground">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>

          <Tabs defaultValue="email" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email"><Mail className="mr-2 h-4 w-4" />Email</TabsTrigger>
              <TabsTrigger value="phone"><Phone className="mr-2 h-4 w-4" />Phone</TabsTrigger>
            </TabsList>
            <TabsContent value="email" className="mt-6">
              <EmailLoginForm />
            </TabsContent>
            <TabsContent value="phone" className="mt-6">
              <PhoneLoginForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function EmailLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-[image:var(--gradient-primary)] shadow-[var(--shadow-soft)]">
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

function PhoneLoginForm() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("OTP sent to your phone");
    setStep("otp");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in!");
    navigate({ to: "/dashboard" });
  };

  if (step === "otp") {
    return (
      <form onSubmit={verifyOtp} className="space-y-4">
        <div className="space-y-2">
          <Label>Enter the 6-digit code sent to {phone}</Label>
          <div className="flex justify-center py-2">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>
        <Button type="submit" disabled={loading || otp.length < 6} className="w-full bg-[image:var(--gradient-primary)]">
          {loading ? "Verifying..." : "Verify & sign in"}
        </Button>
        <button type="button" onClick={() => setStep("phone")} className="w-full text-sm text-muted-foreground hover:text-foreground">
          ← Use a different number
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendOtp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
        <p className="text-xs text-muted-foreground">Include country code (e.g. +91)</p>
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-[image:var(--gradient-primary)] shadow-[var(--shadow-soft)]">
        {loading ? "Sending..." : "Send OTP"}
      </Button>
    </form>
  );
}
