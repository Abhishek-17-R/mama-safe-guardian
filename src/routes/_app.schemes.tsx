import { createFileRoute } from "@tanstack/react-router";
import { Landmark, ExternalLink, Newspaper, IndianRupee, ShieldCheck, Baby, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/_app/schemes")({
  head: () => ({ meta: [{ title: "Schemes & News — MatriCare" }] }),
  component: SchemesPage,
});

interface Scheme {
  name: string;
  agency: string;
  benefit: string;
  eligibility: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SCHEMES: Scheme[] = [
  {
    name: "Pradhan Mantri Matru Vandana Yojana (PMMVY)",
    agency: "Ministry of Women & Child Development",
    benefit: "₹5,000 cash incentive in instalments for first live birth (₹6,000 for second if girl child).",
    eligibility: "Pregnant & lactating mothers aged 19+ (excluding govt employees).",
    url: "https://wcd.gov.in/schemes/pradhan-mantri-matru-vandana-yojana",
    icon: IndianRupee,
  },
  {
    name: "Janani Suraksha Yojana (JSY)",
    agency: "Ministry of Health & Family Welfare",
    benefit: "Cash assistance for institutional delivery — ₹1,400 (rural) / ₹1,000 (urban) in low-performing states.",
    eligibility: "BPL pregnant women aged 19+ delivering in govt or accredited facilities.",
    url: "https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=841&lid=309",
    icon: Stethoscope,
  },
  {
    name: "Janani Shishu Suraksha Karyakaram (JSSK)",
    agency: "National Health Mission",
    benefit: "Free delivery (incl. C-section), free drugs, diagnostics, diet, blood and transport for all pregnant women.",
    eligibility: "All pregnant women delivering in public health institutions.",
    url: "https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=842&lid=308",
    icon: ShieldCheck,
  },
  {
    name: "Pradhan Mantri Surakshit Matritva Abhiyan (PMSMA)",
    agency: "Ministry of Health & Family Welfare",
    benefit: "Free comprehensive antenatal checkup on the 9th of every month at government health facilities.",
    eligibility: "All pregnant women in 2nd & 3rd trimester.",
    url: "https://pmsma.mohfw.gov.in/",
    icon: Baby,
  },
  {
    name: "LaQshya — Labour Room Quality Improvement",
    agency: "National Health Mission",
    benefit: "Quality-certified labour rooms & maternity OTs in public hospitals; respectful maternity care.",
    eligibility: "All women delivering in participating public facilities.",
    url: "https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=1216&lid=658",
    icon: ShieldCheck,
  },
  {
    name: "Anaemia Mukt Bharat",
    agency: "Ministry of Health & Family Welfare",
    benefit: "Free iron-folic acid supplements, deworming, and testing for pregnant women & adolescents.",
    eligibility: "Pregnant women, lactating mothers, and adolescent girls.",
    url: "https://anemiamuktbharat.info/",
    icon: ShieldCheck,
  },
];

const NEWS = [
  {
    title: "WHO: Recommendations on antenatal care",
    source: "World Health Organization",
    summary: "Updated guidelines on the minimum 8 antenatal contacts to reduce maternal & perinatal mortality.",
    url: "https://www.who.int/publications/i/item/9789241549912",
  },
  {
    title: "FOGSI Good Clinical Practice Recommendations",
    source: "Federation of Obstetric & Gynaecological Societies of India",
    summary: "Indian clinical guidelines on hypertensive disorders, anaemia, and gestational diabetes in pregnancy.",
    url: "https://www.fogsi.org/gcpr/",
  },
  {
    title: "ICMR Dietary Guidelines for Pregnant Women",
    source: "Indian Council of Medical Research",
    summary: "Region-specific nutrition advice and recommended daily intake during pregnancy & lactation.",
    url: "https://www.nin.res.in/dietaryguidelines/",
  },
];

function SchemesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Landmark className="h-3.5 w-3.5" /> Government of India
        </div>
        <h1 className="mt-3 font-display text-4xl font-semibold text-foreground">Schemes & Resources</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Maternal health benefits, free services, and trusted clinical guidelines you can access right now.
        </p>
      </div>

      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">Government Schemes</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {SCHEMES.map((s) => (
            <SchemeCard key={s.name} s={s} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl font-semibold text-foreground">Trusted Guidelines & News</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NEWS.map((n) => (
            <a
              key={n.url}
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-primary/30 hover:shadow-[var(--shadow-soft)]"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-primary">{n.source}</p>
              <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-foreground group-hover:text-primary">
                {n.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.summary}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                Read more <ExternalLink className="h-3 w-3" />
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function SchemeCard({ s }: { s: Scheme }) {
  const Icon = s.icon;
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-3xl border border-border/60 bg-card p-6 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-soft)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold leading-snug text-foreground group-hover:text-primary">
            {s.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{s.agency}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <p><span className="font-medium text-foreground">Benefit:</span> <span className="text-muted-foreground">{s.benefit}</span></p>
        <p><span className="font-medium text-foreground">Eligibility:</span> <span className="text-muted-foreground">{s.eligibility}</span></p>
      </div>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
        Visit official site <ExternalLink className="h-3 w-3" />
      </span>
    </a>
  );
}
