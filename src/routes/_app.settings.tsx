import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings as SettingsIcon, Save, Loader2, User, History as HistoryIcon, FileText, CheckCircle2, AlertTriangle, AlertCircle, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { loadPreferences, savePreferences, type Preferences, type Language, type Theme, type Units, type FontSize } from "@/lib/preferences";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — MatriCare" }] }),
  component: SettingsPage,
});

interface ProfileForm {
  full_name: string;
  date_of_birth: string;
  age: string;
  address: string;
  phone: string;
  email: string;
}

interface PredictionRow {
  id: string;
  created_at: string;
  patient_name: string | null;
  risk_level: "low" | "mid" | "high";
  probability: number;
  systolic_bp: number;
  diastolic_bp: number;
  bs: number;
  bmi: number;
}

function SettingsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [form, setForm] = useState<ProfileForm>({
    full_name: "", date_of_birth: "", age: "", address: "", phone: "", email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reports, setReports] = useState<PredictionRow[] | null>(null);
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences());

  const updatePref = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePreferences(next);
    toast.success(t("settings.prefSaved"));
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: preds }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("predictions").select("id,created_at,patient_name,risk_level,probability,systolic_bp,diastolic_bp,bs,bmi").order("created_at", { ascending: false }).limit(5),
      ]);
      setForm({
        full_name: profile?.full_name ?? "",
        date_of_birth: profile?.date_of_birth ?? "",
        age: profile?.age != null ? String(profile.age) : "",
        address: profile?.address ?? "",
        phone: profile?.phone ?? user.phone ?? "",
        email: profile?.email ?? user.email ?? "",
      });
      setReports((preds as PredictionRow[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const handleChange = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-derive age from DOB
      if (field === "date_of_birth" && value) {
        const dob = new Date(value);
        if (!isNaN(dob.getTime())) {
          const diff = Date.now() - dob.getTime();
          const yrs = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
          next.age = String(yrs);
        }
      }
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: form.full_name.trim() || null,
      date_of_birth: form.date_of_birth || null,
      age: form.age ? parseInt(form.age, 10) : null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("settings.profileSaved"));
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-soft)]">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">{t("settings.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("common.loading")}
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <form onSubmit={handleSave} className="lg:col-span-2 space-y-6 rounded-3xl border border-border/60 bg-card p-6">
            <div className="flex items-center gap-2 border-b border-border/60 pb-4">
              <User className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">{t("settings.personal")}</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("settings.fullName")} id="full_name">
                <Input id="full_name" value={form.full_name} onChange={(e) => handleChange("full_name", e.target.value)} placeholder="Jane Doe" maxLength={100} />
              </Field>
              <Field label={t("settings.dob")} id="dob">
                <Input id="dob" type="date" value={form.date_of_birth} onChange={(e) => handleChange("date_of_birth", e.target.value)} />
              </Field>
              <Field label={t("settings.age")} id="age">
                <Input id="age" type="number" min={0} max={120} value={form.age} onChange={(e) => handleChange("age", e.target.value)} placeholder="28" />
              </Field>
              <Field label={t("settings.phone")} id="phone">
                <Input id="phone" type="tel" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="+1 555 123 4567" maxLength={20} />
              </Field>
              <Field label={t("settings.email")} id="email">
                <Input id="email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="you@example.com" maxLength={255} />
              </Field>
              <Field label={t("settings.address")} id="address" className="sm:col-span-2">
                <Textarea id="address" value={form.address} onChange={(e) => handleChange("address", e.target.value)} placeholder="Street, City, State, ZIP" rows={3} maxLength={500} />
              </Field>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving} className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-soft)]">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t("common.saveChanges")}
              </Button>
            </div>
          </form>

          <section className="lg:col-span-2 space-y-6 rounded-3xl border border-border/60 bg-card p-6">
            <div className="flex items-center gap-2 border-b border-border/60 pb-4">
              <Sliders className="h-4 w-4 text-primary" />
              <div>
                <h2 className="font-display text-lg font-semibold">{t("settings.preferences")}</h2>
                <p className="text-xs text-muted-foreground">{t("settings.prefsHint")}</p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <PrefRow label={t("settings.language")} hint={t("settings.languageHint")}>
                <Select value={prefs.language} onValueChange={(v) => updatePref("language", v as Language)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="kn">ಕನ್ನಡ (Kannada)</SelectItem>
                    <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                    <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                    <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                    <SelectItem value="ml">മലയാളം (Malayalam)</SelectItem>
                  </SelectContent>
                </Select>
              </PrefRow>

              <PrefRow label={t("settings.theme")} hint={t("settings.themeHint")}>
                <Select value={prefs.theme} onValueChange={(v) => updatePref("theme", v as Theme)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t("settings.light")}</SelectItem>
                    <SelectItem value="dark">{t("settings.dark")}</SelectItem>
                  </SelectContent>
                </Select>
              </PrefRow>

              <PrefRow label={t("settings.units")} hint={t("settings.unitsHint")}>
                <Select value={prefs.units} onValueChange={(v) => updatePref("units", v as Units)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">{t("settings.metric")}</SelectItem>
                    <SelectItem value="imperial">{t("settings.imperial")}</SelectItem>
                  </SelectContent>
                </Select>
              </PrefRow>

              <PrefRow label={t("settings.fontSize")} hint={t("settings.fontSizeHint")}>
                <Select value={prefs.fontSize} onValueChange={(v) => updatePref("fontSize", v as FontSize)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">{t("settings.small")}</SelectItem>
                    <SelectItem value="medium">{t("settings.medium")}</SelectItem>
                    <SelectItem value="large">{t("settings.large")}</SelectItem>
                  </SelectContent>
                </Select>
              </PrefRow>

              <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("settings.notifications")}</p>
                  <p className="text-xs text-muted-foreground">{t("settings.notificationsHint")}</p>
                </div>
                <Switch checked={prefs.notifications} onCheckedChange={(v) => updatePref("notifications", v)} />
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-border/60 bg-card p-6">
            <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-4">
              <HistoryIcon className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">{t("settings.recentReports")}</h2>
            </div>

            {reports && reports.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("settings.noReports")}</p>
                <Button asChild size="sm" className="mt-3" variant="outline">
                  <Link to="/predict">{t("common.startOne")}</Link>
                </Button>
              </div>
            )}

            <ul className="space-y-3">
              {reports?.map((r) => {
                const meta = {
                  low: { Icon: CheckCircle2, label: t("risk.low"), color: "text-success", bg: "bg-success/10" },
                  mid: { Icon: AlertTriangle, label: t("risk.mid"), color: "text-warning", bg: "bg-warning/10" },
                  high: { Icon: AlertCircle, label: t("risk.high"), color: "text-destructive", bg: "bg-destructive/10" },
                }[r.risk_level];
                const Icon = meta.Icon;
                return (
                  <li key={r.id} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{r.patient_name || "Unnamed"}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.bg} ${meta.color}`}>
                          {meta.label} · {Math.round(r.probability * 100)}%
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span>BP {r.systolic_bp}/{r.diastolic_bp}</span>
                        <span>BS {r.bs}</span>
                        <span>BMI {r.bmi}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {reports && reports.length > 0 && (
              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <Link to="/history">{t("settings.viewAllReports")}</Link>
              </Button>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function Field({ label, id, children, className }: { label: string; id: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function PrefRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
