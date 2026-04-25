import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, MessageCircle, History, Sparkles, Activity, Landmark, Newspaper, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { getMaternalNews, type NewsItem } from "@/lib/news.functions";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MatriCare" }] }),
  loader: () => getMaternalNews(),
  component: Dashboard,
});

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

function Dashboard() {
  const { user } = useAuth();
  const { articles, error } = Route.useLoaderData();
  const name = (user?.user_metadata?.full_name as string | undefined) || "there";

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="rounded-3xl bg-[image:var(--gradient-hero)] p-8 sm:p-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" /> Welcome to MatriCare
        </div>
        <h1 className="mt-4 font-display text-4xl font-semibold text-foreground sm:text-5xl">
          Hello, {name.split(" ")[0]}.
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Ready for your next assessment? Upload a hospital report or enter vitals manually to get an instant AI-powered risk prediction.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-soft)]">
            <Link to="/predict">
              <FileText className="mr-2 h-4 w-4" /> Start new assessment
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/history">
              <History className="mr-2 h-4 w-4" /> View history
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <QuickCard icon={FileText} title="New Assessment" desc="Upload a PDF or fill the form to predict risk." to="/predict" />
            <QuickCard icon={History} title="Past Reports" desc="Review your previous risk assessments and trends." to="/history" />
            <QuickCard icon={MessageCircle} title="Pregnancy Chat" desc="Ask anything — we're here to help, day or night." to="/chatbot" />
            <QuickCard icon={Landmark} title="Schemes & Benefits" desc="Government schemes and free maternal care you qualify for." to="/schemes" />
          </div>

          <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Activity className="h-4 w-4 text-primary" />
              <span>More features coming soon: trend graphs and doctor-ready PDF reports.</span>
            </div>
          </div>
        </div>

        <aside className="lg:col-span-1">
          <NewsColumn articles={articles} error={error} />
        </aside>
      </div>
    </div>
  );
}

function NewsColumn({ articles, error }: { articles: NewsItem[]; error: string | null }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
          <Newspaper className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Latest News</h2>
          <p className="text-xs text-muted-foreground">Maternal health worldwide</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!error && articles.length === 0 && (
        <p className="text-sm text-muted-foreground">No recent news available.</p>
      )}

      <ul className="space-y-4">
        {articles.map((a) => (
          <li key={a.url}>
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl border border-transparent p-3 -mx-3 transition-all hover:border-primary/20 hover:bg-primary/5"
            >
              {a.image && (
                <img
                  src={a.image}
                  alt=""
                  loading="lazy"
                  className="mb-3 aspect-video w-full rounded-xl object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-primary">
                <span className="truncate">{a.source}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground normal-case tracking-normal">{timeAgo(a.publishedAt)}</span>
              </div>
              <h3 className="mt-1.5 line-clamp-3 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                {a.title}
              </h3>
              {a.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{a.description}</p>
              )}
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                Read <ExternalLink className="h-3 w-3" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuickCard({ icon: Icon, title, desc, to }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; to: string }) {
  return (
    <Link
      to={to}
      className="group rounded-3xl border border-border/60 bg-card p-7 transition-all hover:border-primary/30 hover:shadow-[var(--shadow-soft)]"
    >
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </Link>
  );
}
