import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Brain, TreePine, Target, BarChart3, Loader2 } from "lucide-react";
import { getModelInsights } from "@/lib/predict.functions";

export const Route = createFileRoute("/_app/insights")({
  head: () => ({ meta: [{ title: "Model Insights — MatriCare" }] }),
  component: InsightsPage,
});

const FEATURE_LABELS: Record<string, string> = {
  age: "Age",
  systolic_bp: "Systolic BP",
  diastolic_bp: "Diastolic BP",
  bs: "Blood Sugar",
  body_temp: "Body Temp",
  heart_rate: "Heart Rate",
  bmi: "BMI",
  hemoglobin: "Hemoglobin",
  diabetes: "Diabetes",
  prev_complications: "Prev. Complications",
};

type Insights = Awaited<ReturnType<typeof getModelInsights>>;

function InsightsPage() {
  const fn = useServerFn(getModelInsights);
  const [data, setData] = useState<Insights | null>(null);

  useEffect(() => {
    fn({}).then(setData).catch(console.error);
  }, [fn]);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const maxImp = Math.max(...data.importance.map((d) => d.importance));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Brain className="h-3.5 w-3.5" /> Machine Learning
        </div>
        <h1 className="mt-3 font-display text-4xl font-semibold text-foreground">Model Insights</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Transparency into the Random Forest classifier powering MatriCare's risk predictions —
          its training metrics, feature importance, and decision behaviour.
        </p>
      </header>

      {/* Model card */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={TreePine} label="Algorithm" value={data.meta.type} sub={`${data.meta.n_trees} trees`} />
        <Stat icon={Target} label="Accuracy" value={`${(data.metrics.accuracy * 100).toFixed(1)}%`} sub="held-out test" />
        <Stat icon={BarChart3} label="F1 Score" value={data.metrics.f1.toFixed(3)} sub="weighted avg" />
        <Stat icon={Brain} label="Features" value={String(data.meta.n_features)} sub={`${data.meta.labels.length} risk classes`} />
      </section>

      {/* Feature importance */}
      <section className="rounded-3xl border border-border/60 bg-card p-7 shadow-[var(--shadow-soft)]">
        <h2 className="font-display text-2xl font-semibold text-foreground">Feature Importance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          How often each vital is used as a decision split across all {data.meta.n_trees} trees.
          Higher = more influential in the model's predictions.
        </p>
        <div className="mt-6 space-y-3">
          {data.importance.map((d) => (
            <div key={d.feature}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-foreground">{FEATURE_LABELS[d.feature] ?? d.feature}</span>
                <span className="text-muted-foreground">{(d.importance * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                  style={{ width: `${(d.importance / maxImp) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Per-class metrics */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border/60 bg-card p-7 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-2xl font-semibold text-foreground">Per-Class Performance</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2">Class</th>
                <th className="pb-2 text-right">Precision</th>
                <th className="pb-2 text-right">Recall</th>
                <th className="pb-2 text-right">F1</th>
                <th className="pb-2 text-right">Support</th>
              </tr>
            </thead>
            <tbody>
              {data.metrics.perClass.map((c) => (
                <tr key={c.label} className="border-b border-border/40 last:border-0">
                  <td className="py-2.5 capitalize">
                    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${
                      c.label === "high" ? "bg-destructive/10 text-destructive"
                      : c.label === "mid" ? "bg-warning/15 text-warning-foreground"
                      : "bg-success/15 text-success"
                    }`}>{c.label} risk</span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{c.precision.toFixed(2)}</td>
                  <td className="py-2.5 text-right tabular-nums">{c.recall.toFixed(2)}</td>
                  <td className="py-2.5 text-right tabular-nums">{c.f1.toFixed(2)}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{c.support}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Confusion matrix */}
        <div className="rounded-3xl border border-border/60 bg-card p-7 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-2xl font-semibold text-foreground">Confusion Matrix</h2>
          <p className="mt-1 text-sm text-muted-foreground">Rows = actual, columns = predicted.</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2"></th>
                  {data.meta.labels.map((l) => (
                    <th key={l} className="p-2 text-xs font-medium uppercase text-muted-foreground">{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.metrics.confusion.map((row, i) => {
                  const rowMax = Math.max(...row);
                  return (
                    <tr key={i}>
                      <th className="bg-muted/50 p-2 text-xs font-medium uppercase text-muted-foreground">
                        {data.meta.labels[i]}
                      </th>
                      {row.map((v, j) => {
                        const intensity = v / rowMax;
                        const isDiag = i === j;
                        return (
                          <td
                            key={j}
                            className="p-3 text-center tabular-nums"
                            style={{
                              backgroundColor: isDiag
                                ? `color-mix(in oklab, var(--success) ${intensity * 35}%, transparent)`
                                : `color-mix(in oklab, var(--destructive) ${intensity * 25}%, transparent)`,
                            }}
                          >
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="rounded-3xl border border-border/60 bg-[image:var(--gradient-warm)] p-7">
        <h2 className="font-display text-2xl font-semibold text-foreground">How the model works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { t: "1. Ensemble of trees", d: `${data.meta.n_trees} decision trees each vote on the risk class. Bagging on bootstrapped samples reduces variance.` },
            { t: "2. Probabilistic output", d: "Tree votes are averaged into a calibrated probability distribution over low / mid / high risk." },
            { t: "3. Explainable", d: "Each prediction's decision path is traced to surface which vitals drove the result." },
          ].map((s) => (
            <div key={s.t} className="rounded-2xl bg-card p-5 shadow-[var(--shadow-soft)]">
              <h3 className="font-display text-lg font-semibold text-foreground">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold text-foreground capitalize">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
