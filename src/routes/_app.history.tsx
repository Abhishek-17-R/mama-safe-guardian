import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { History, Download, FileText, CheckCircle2, AlertTriangle, AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { downloadReportPdf } from "@/lib/report-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/history")({
  head: () => ({ meta: [{ title: "History — MatriCare" }] }),
  component: HistoryPage,
});

interface PredictionRow {
  id: string;
  created_at: string;
  patient_name: string | null;
  risk_level: "low" | "mid" | "high";
  probability: number;
  age: number;
  systolic_bp: number;
  diastolic_bp: number;
  bs: number;
  body_temp: number;
  heart_rate: number;
  bmi: number;
  hemoglobin: number;
  diabetes: number;
  prev_complications: number;
  notes: string | null;
}

function HistoryPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PredictionRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error(error.message);
        setRows([]);
      } else {
        setRows(data as PredictionRow[]);
      }
    })();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this assessment? This cannot be undone.")) return;
    const { error } = await supabase.from("predictions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev?.filter((r) => r.id !== id) ?? null);
    toast.success("Deleted");
  };

  const handleDownload = (r: PredictionRow) => {
    // Approximate breakdown from stored probability (we only store the winning class probability).
    const winner = r.probability;
    const rest = (1 - winner) / 2;
    const probabilities = {
      low: r.risk_level === "low" ? winner : rest,
      mid: r.risk_level === "mid" ? winner : rest,
      high: r.risk_level === "high" ? winner : rest,
    };
    downloadReportPdf({
      id: r.id,
      patient_name: r.patient_name,
      created_at: r.created_at,
      risk_level: r.risk_level,
      probability: r.probability,
      probabilities,
      vitals: {
        age: r.age, systolic_bp: r.systolic_bp, diastolic_bp: r.diastolic_bp,
        bs: r.bs, body_temp: r.body_temp, heart_rate: r.heart_rate,
        bmi: r.bmi, hemoglobin: r.hemoglobin, diabetes: r.diabetes, prev_complications: r.prev_complications,
      },
      notes: r.notes,
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-foreground">Your History</h1>
          <p className="mt-2 text-muted-foreground">All past assessments. Download reports anytime.</p>
        </div>
        <Button asChild className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-soft)]">
          <Link to="/predict"><Plus className="mr-2 h-4 w-4" /> New assessment</Link>
        </Button>
      </div>

      {rows === null && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <History className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-foreground">No assessments yet</h2>
          <p className="mt-2 text-muted-foreground">Start your first risk assessment to see it here.</p>
          <Button asChild className="mt-6 bg-[image:var(--gradient-primary)]">
            <Link to="/predict"><FileText className="mr-2 h-4 w-4" /> Start assessment</Link>
          </Button>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((r) => (
            <RowCard key={r.id} r={r} onDownload={() => handleDownload(r)} onDelete={() => handleDelete(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RowCard({ r, onDownload, onDelete }: { r: PredictionRow; onDownload: () => void; onDelete: () => void }) {
  const meta = {
    low: { Icon: CheckCircle2, label: "Low", color: "text-success", bg: "bg-success/10", ring: "ring-success/20" },
    mid: { Icon: AlertTriangle, label: "Moderate", color: "text-warning", bg: "bg-warning/10", ring: "ring-warning/20" },
    high: { Icon: AlertCircle, label: "High", color: "text-destructive", bg: "bg-destructive/10", ring: "ring-destructive/20" },
  }[r.risk_level];

  const Icon = meta.Icon;
  const date = new Date(r.created_at).toLocaleString(undefined, {
    dateStyle: "medium", timeStyle: "short",
  });

  return (
    <div className={`group rounded-2xl border border-border/60 bg-card p-5 ring-1 ${meta.ring} transition-all hover:shadow-[var(--shadow-soft)]`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
          <Icon className={`h-6 w-6 ${meta.color}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {r.patient_name || "Unnamed patient"}
            </h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}>
              {meta.label} · {Math.round(r.probability * 100)}%
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{date}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>BP {r.systolic_bp}/{r.diastolic_bp}</span>
            <span>BS {r.bs}</span>
            <span>BMI {r.bmi}</span>
            <span>Hb {r.hemoglobin}</span>
            <span>HR {r.heart_rate}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
