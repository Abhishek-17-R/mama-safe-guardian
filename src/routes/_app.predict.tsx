import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, ArrowLeft, Sparkles, History, Download } from "lucide-react";
import { downloadReportPdf } from "@/lib/report-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { extractFromPdf, predictAndSave } from "@/lib/predict.functions";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/predict")({
  head: () => ({ meta: [{ title: "New Assessment — MatriCare" }] }),
  component: PredictPage,
});

type Step = "upload" | "form" | "result";

interface FormState {
  patient_name: string;
  age: string;
  systolic_bp: string;
  diastolic_bp: string;
  bs: string;
  body_temp: string;
  heart_rate: string;
  bmi: string;
  hemoglobin: string;
  diabetes: boolean;
  prev_complications: boolean;
  notes: string;
}

const emptyForm: FormState = {
  patient_name: "",
  age: "",
  systolic_bp: "",
  diastolic_bp: "",
  bs: "",
  body_temp: "",
  heart_rate: "",
  bmi: "",
  hemoglobin: "",
  diabetes: false,
  prev_complications: false,
  notes: "",
};

function PredictPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [result, setResult] = useState<{ id: string; risk_level: "low" | "mid" | "high"; probability: number; probabilities: { low: number; mid: number; high: number } } | null>(null);

  const extractFn = useServerFn(extractFromPdf);
  const predictFn = useServerFn(predictAndSave);

  const handlePdfUpload = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File too large. Max 15MB.");
      return;
    }
    setExtracting(true);

    try {
      // 1. Upload to storage
      const userId = user?.id;
      if (!userId) throw new Error("Not authenticated");
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("patient_reports").upload(path, file);
      if (upErr) throw upErr;
      setPdfPath(path);

      // 2. Convert to base64 and send to AI
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
      }
      const b64 = btoa(binary);

      const { extracted } = await extractFn({ data: { pdfBase64: b64, mimeType: file.type || "application/pdf" } });

      setForm({
        patient_name: extracted.patient_name ?? "",
        age: extracted.age?.toString() ?? "",
        systolic_bp: extracted.systolic_bp?.toString() ?? "",
        diastolic_bp: extracted.diastolic_bp?.toString() ?? "",
        bs: extracted.bs?.toString() ?? "",
        body_temp: extracted.body_temp?.toString() ?? "",
        heart_rate: extracted.heart_rate?.toString() ?? "",
        bmi: extracted.bmi?.toString() ?? "",
        hemoglobin: extracted.hemoglobin?.toString() ?? "",
        diabetes: extracted.diabetes === 1,
        prev_complications: extracted.prev_complications === 1,
        notes: "",
      });

      const found = Object.values(extracted).filter((v) => v !== null).length;
      toast.success(`Extracted ${found} fields. Review and edit before predicting.`);
      setStep("form");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setPredicting(true);
    try {
      const payload = {
        age: Number(form.age),
        systolic_bp: Number(form.systolic_bp),
        diastolic_bp: Number(form.diastolic_bp),
        bs: Number(form.bs),
        body_temp: Number(form.body_temp),
        heart_rate: Number(form.heart_rate),
        bmi: Number(form.bmi),
        hemoglobin: Number(form.hemoglobin),
        diabetes: form.diabetes ? 1 : 0,
        prev_complications: form.prev_complications ? 1 : 0,
        patient_name: form.patient_name || null,
        notes: form.notes || null,
        pdf_path: pdfPath,
      };
      const res = await predictFn({ data: payload });
      setResult(res);
      setStep("result");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Prediction failed");
    } finally {
      setPredicting(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setForm(emptyForm);
    setPdfPath(null);
    setResult(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Stepper step={step} />

      {step === "upload" && (
        <UploadStep
          extracting={extracting}
          onUpload={handlePdfUpload}
          onSkip={() => setStep("form")}
        />
      )}

      {step === "form" && (
        <FormStep
          form={form}
          setForm={setForm}
          predicting={predicting}
          onSubmit={handlePredict}
          onBack={() => setStep("upload")}
          hasPdf={!!pdfPath}
        />
      )}

      {step === "result" && result && (
        <ResultStep result={result} onNew={reset} />
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "form", label: "Review" },
    { key: "result", label: "Result" },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="mb-10 flex items-center gap-3">
      {steps.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
            i <= idx ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-soft)]" : "bg-muted text-muted-foreground"
          }`}>
            {i < idx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </div>
          <span className={`text-sm font-medium ${i <= idx ? "text-foreground" : "text-muted-foreground"}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`hidden h-px flex-1 sm:block ${i < idx ? "bg-primary/40" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function UploadStep({ extracting, onUpload, onSkip }: { extracting: boolean; onUpload: (f: File) => void; onSkip: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-4xl font-semibold text-foreground">New Risk Assessment</h1>
        <p className="mt-3 text-muted-foreground">
          Upload your hospital report and our AI will extract the vitals automatically.
        </p>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onUpload(f);
        }}
        className={`relative block cursor-pointer rounded-3xl border-2 border-dashed bg-card p-12 text-center transition-all ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        } ${extracting ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          type="file"
          accept="application/pdf,image/*"
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={extracting}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
        />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-soft)]">
          {extracting ? <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" /> : <Upload className="h-6 w-6 text-primary-foreground" />}
        </div>
        <p className="font-display text-xl font-semibold text-foreground">
          {extracting ? "AI is reading your report..." : "Drop your PDF here"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {extracting ? "This may take 10-20 seconds" : "or click to browse · PDF, JPG, PNG · max 15MB"}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3 w-3" /> Powered by Gemini Vision
        </div>
      </label>

      <div className="text-center">
        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground"
          disabled={extracting}
        >
          Skip — I'll enter values manually →
        </button>
      </div>
    </div>
  );
}

function FormStep({ form, setForm, predicting, onSubmit, onBack, hasPdf }: {
  form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>;
  predicting: boolean; onSubmit: (e: React.FormEvent) => void; onBack: () => void; hasPdf: boolean;
}) {
  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">Review your vitals</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {hasPdf ? "Edit any value the AI got wrong, then predict." : "Enter your latest vitals to predict risk."}
        </p>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Patient name (optional)" full>
            <Input value={form.patient_name} onChange={(e) => update("patient_name", e.target.value)} placeholder="Jane Doe" />
          </Field>

          <Field label="Age (years)" required>
            <Input type="number" min={10} max={70} required value={form.age} onChange={(e) => update("age", e.target.value)} />
          </Field>
          <Field label="BMI (kg/m²)" required>
            <Input type="number" step="0.1" min={10} max={60} required value={form.bmi} onChange={(e) => update("bmi", e.target.value)} />
          </Field>

          <Field label="Systolic BP (mmHg)" required>
            <Input type="number" min={50} max={250} required value={form.systolic_bp} onChange={(e) => update("systolic_bp", e.target.value)} />
          </Field>
          <Field label="Diastolic BP (mmHg)" required>
            <Input type="number" min={30} max={180} required value={form.diastolic_bp} onChange={(e) => update("diastolic_bp", e.target.value)} />
          </Field>

          <Field label="Blood Sugar (mmol/L)" required>
            <Input type="number" step="0.1" min={2} max={30} required value={form.bs} onChange={(e) => update("bs", e.target.value)} />
          </Field>
          <Field label="Body Temp (°F)" required>
            <Input type="number" step="0.1" min={90} max={110} required value={form.body_temp} onChange={(e) => update("body_temp", e.target.value)} />
          </Field>

          <Field label="Heart Rate (bpm)" required>
            <Input type="number" min={30} max={220} required value={form.heart_rate} onChange={(e) => update("heart_rate", e.target.value)} />
          </Field>
          <Field label="Hemoglobin (g/dL)" required>
            <Input type="number" step="0.1" min={4} max={20} required value={form.hemoglobin} onChange={(e) => update("hemoglobin", e.target.value)} />
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
            <div>
              <Label className="text-sm font-medium">Diabetes</Label>
              <p className="text-xs text-muted-foreground">Including gestational</p>
            </div>
            <Switch checked={form.diabetes} onCheckedChange={(v) => update("diabetes", v)} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
            <div>
              <Label className="text-sm font-medium">Previous complications</Label>
              <p className="text-xs text-muted-foreground">In past pregnancies</p>
            </div>
            <Switch checked={form.prev_complications} onCheckedChange={(v) => update("prev_complications", v)} />
          </div>

          <Field label="Notes (optional)" full>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Any symptoms or concerns..." rows={3} />
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack} disabled={predicting}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button type="submit" size="lg" disabled={predicting} className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-soft)]">
          {predicting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
          ) : (
            <>Predict risk <ArrowRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children, full, required }: { label: string; children: React.ReactNode; full?: boolean; required?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function ResultStep({ result, onNew }: {
  result: { id: string; risk_level: "low" | "mid" | "high"; probability: number; probabilities: { low: number; mid: number; high: number } };
  onNew: () => void;
}) {
  const meta = {
    low: {
      icon: CheckCircle2,
      title: "Low Risk",
      desc: "Your vitals look healthy. Continue routine prenatal checkups.",
      color: "text-success",
      bg: "bg-success/10",
      ring: "ring-success/30",
    },
    mid: {
      icon: AlertTriangle,
      title: "Moderate Risk",
      desc: "Some indicators need attention. Schedule a checkup with your doctor soon.",
      color: "text-warning",
      bg: "bg-warning/10",
      ring: "ring-warning/30",
    },
    high: {
      icon: AlertCircle,
      title: "High Risk",
      desc: "Please consult your obstetrician immediately. Do not delay.",
      color: "text-destructive",
      bg: "bg-destructive/10",
      ring: "ring-destructive/30",
    },
  }[result.risk_level];

  const Icon = meta.icon;
  const pct = Math.round(result.probability * 100);

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border bg-card p-8 text-center shadow-[var(--shadow-elegant)] ring-2 ${meta.ring}`}>
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${meta.bg}`}>
          <Icon className={`h-8 w-8 ${meta.color}`} />
        </div>
        <h1 className="font-display text-4xl font-semibold text-foreground sm:text-5xl">{meta.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">{meta.desc}</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm">
          <span className="text-muted-foreground">Confidence:</span>
          <span className="font-semibold text-foreground">{pct}%</span>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-6">
        <h3 className="font-display text-lg font-semibold text-foreground">Probability breakdown</h3>
        <div className="mt-4 space-y-3">
          {(["low", "mid", "high"] as const).map((k) => (
            <div key={k}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="capitalize text-muted-foreground">{k} risk</span>
                <span className="font-medium text-foreground">{Math.round(result.probabilities[k] * 100)}%</span>
              </div>
              <Progress value={result.probabilities[k] * 100} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground">
        <strong className="text-foreground">Disclaimer:</strong> MatriCare is a decision-support tool, not a substitute for professional medical advice. Always consult your healthcare provider.
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={onNew} variant="outline" size="lg">
          <FileText className="mr-2 h-4 w-4" /> New assessment
        </Button>
        <Button asChild size="lg" className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-soft)]">
          <Link to="/history">
            <History className="mr-2 h-4 w-4" /> View history
          </Link>
        </Button>
      </div>
    </div>
  );
}
