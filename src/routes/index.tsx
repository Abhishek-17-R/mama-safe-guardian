import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Heart, Activity, FileText, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import heroImg from "../assets/hero.jpg?url";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MatriCare — AI Maternal Health Risk Prediction" },
      { name: "description", content: "Upload a hospital report or enter vitals. Get instant AI-powered maternal health risk assessment with 86%+ accuracy." },
      { property: "og:title", content: "MatriCare — Safer Pregnancies, Smarter Care" },
      { property: "og:description", content: "AI-powered maternal health risk assessment from your hospital report." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-soft)]">
              <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-display text-xl font-semibold text-foreground">MatriCare</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">How it works</a>
            <a href="#trust" className="text-sm text-muted-foreground hover:text-foreground">Why trust us</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-soft)]">
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[image:var(--gradient-hero)] pointer-events-none" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by AI · 86%+ accuracy
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] text-foreground sm:text-6xl lg:text-7xl">
              Safer pregnancies,<br />
              <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">smarter care.</span>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
              Upload your hospital report or enter vitals. MatriCare reads it with AI, predicts maternal risk in seconds, and guides you to the right next step.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild size="lg" className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-elegant)]">
                <Link to="/signup">Start free assessment</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                Private & encrypted
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Clinically grounded
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-[image:var(--gradient-primary)] opacity-20 blur-3xl" />
            <img
              src={heroImg}
              alt="Pregnant woman cradling her belly, MatriCare maternal health"
              className="relative aspect-square w-full rounded-[2rem] object-cover shadow-[var(--shadow-elegant)]"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-semibold text-foreground sm:text-5xl">
            Everything you need, in one place
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From hospital report to risk prediction to personalized guidance.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: FileText, title: "AI Report Reader", desc: "Upload any hospital PDF — typed or scanned. Gemini Vision extracts your vitals automatically." },
            { icon: Activity, title: "Risk Prediction", desc: "Random Forest trained on 1,200+ records predicts low / mid / high risk with calibrated confidence." },
            { icon: MessageCircle, title: "Pregnancy Chatbot", desc: "Ask anything about your symptoms, diet, or trimester — answered with care, anytime." },
            { icon: ShieldCheck, title: "Govt. Schemes", desc: "Discover maternal benefits like PMMVY & JSY you may be eligible for." },
            { icon: Heart, title: "PDF Report", desc: "Download a shareable risk report for your doctor in one click." },
            { icon: Sparkles, title: "History & Trends", desc: "Track your assessments over time and spot changes early." },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-3xl border border-border/60 bg-card p-7 transition-all hover:border-primary/30 hover:shadow-[var(--shadow-soft)]"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-[image:var(--gradient-warm)] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-semibold text-foreground sm:text-5xl">
              Three steps to clarity
            </h2>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              { n: "01", t: "Upload or enter", d: "Drop your hospital report PDF or fill the quick form." },
              { n: "02", t: "AI analyzes", d: "Vitals are extracted and run through our risk model in seconds." },
              { n: "03", t: "Act with confidence", d: "Get your risk level, recommendations, and a doctor-ready PDF." },
            ].map((s) => (
              <div key={s.n} className="relative rounded-3xl bg-card p-8 shadow-[var(--shadow-soft)]">
                <div className="font-display text-6xl font-semibold text-primary/15">{s.n}</div>
                <h3 className="mt-4 font-display text-2xl font-semibold text-foreground">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / CTA */}
      <section id="trust" className="mx-auto max-w-5xl px-6 py-24">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[image:var(--gradient-primary)] p-12 text-center shadow-[var(--shadow-elegant)] sm:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white_0%,transparent_50%)] opacity-10" />
          <div className="relative">
            <h2 className="font-display text-4xl font-semibold text-primary-foreground sm:text-5xl">
              Your pregnancy deserves the best care.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">
              Join thousands of expectant mothers using MatriCare for proactive, AI-guided maternal health.
            </p>
            <Button asChild size="lg" className="mt-8 bg-background text-foreground hover:bg-background/90">
              <Link to="/signup">Create your free account</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" fill="currentColor" />
            <span>© {new Date().getFullYear()} MatriCare. Made with care.</span>
          </div>
          <span>Not a substitute for medical advice.</span>
        </div>
      </footer>
    </div>
  );
}
