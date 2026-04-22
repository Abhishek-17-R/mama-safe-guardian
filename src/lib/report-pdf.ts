import { jsPDF } from "jspdf";

export interface ReportData {
  id: string;
  patient_name?: string | null;
  created_at?: string;
  risk_level: "low" | "mid" | "high";
  probability: number;
  probabilities: { low: number; mid: number; high: number };
  vitals: {
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
  };
  notes?: string | null;
}

const RISK_META = {
  low: { label: "LOW RISK", color: [34, 139, 92] as [number, number, number], desc: "Vitals look healthy. Continue routine prenatal checkups." },
  mid: { label: "MODERATE RISK", color: [217, 144, 33] as [number, number, number], desc: "Some indicators need attention. Schedule a checkup soon." },
  high: { label: "HIGH RISK", color: [200, 50, 60] as [number, number, number], desc: "Please consult your obstetrician immediately. Do not delay." },
};

export function generateReportPdf(data: ReportData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  const meta = RISK_META[data.risk_level];
  const dateStr = data.created_at
    ? new Date(data.created_at).toLocaleString()
    : new Date().toLocaleString();

  // Header bar
  doc.setFillColor(236, 72, 122);
  doc.rect(0, 0, pageW, 8, "F");

  // Brand
  y = margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 30, 30);
  doc.text("MatriCare", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text("Maternal Health Risk Report", margin, y + 16);

  // Date right
  doc.setFontSize(9);
  doc.text(dateStr, pageW - margin, y, { align: "right" });
  doc.text(`Report ID: ${data.id.slice(0, 8)}`, pageW - margin, y + 14, { align: "right" });

  y += 44;

  // Patient
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, pageW - margin, y);
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text("PATIENT", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(data.patient_name || "Unnamed patient", margin, y + 18);
  y += 44;

  // Risk badge box
  doc.setFillColor(meta.color[0], meta.color[1], meta.color[2]);
  doc.roundedRect(margin, y, pageW - margin * 2, 70, 8, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(meta.label, margin + 20, y + 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const descLines = doc.splitTextToSize(meta.desc, pageW - margin * 2 - 180);
  doc.text(descLines, margin + 20, y + 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(`${Math.round(data.probability * 100)}%`, pageW - margin - 20, y + 38, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("confidence", pageW - margin - 20, y + 52, { align: "right" });
  y += 90;

  // Probability breakdown
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PROBABILITY BREAKDOWN", margin, y);
  y += 16;

  (["low", "mid", "high"] as const).forEach((k) => {
    const pct = Math.round(data.probabilities[k] * 100);
    const barW = pageW - margin * 2 - 80;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(k.charAt(0).toUpperCase() + k.slice(1), margin, y + 9);
    // bg
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(margin + 60, y, barW, 12, 6, 6, "F");
    // fill
    const c = RISK_META[k].color;
    doc.setFillColor(c[0], c[1], c[2]);
    doc.roundedRect(margin + 60, y, Math.max(2, (barW * pct) / 100), 12, 6, 6, "F");
    doc.setTextColor(40, 40, 40);
    doc.text(`${pct}%`, pageW - margin, y + 9, { align: "right" });
    y += 22;
  });

  y += 12;

  // Vitals table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text("EXTRACTED VITALS", margin, y);
  y += 14;

  const v = data.vitals;
  const rows: [string, string][] = [
    ["Age", `${v.age} years`],
    ["BMI", `${v.bmi} kg/m²`],
    ["Systolic BP", `${v.systolic_bp} mmHg`],
    ["Diastolic BP", `${v.diastolic_bp} mmHg`],
    ["Blood Sugar", `${v.bs} mmol/L`],
    ["Body Temp", `${v.body_temp} °F`],
    ["Heart Rate", `${v.heart_rate} bpm`],
    ["Hemoglobin", `${v.hemoglobin} g/dL`],
    ["Diabetes", v.diabetes ? "Yes" : "No"],
    ["Previous complications", v.prev_complications ? "Yes" : "No"],
  ];

  const colW = (pageW - margin * 2) / 2;
  doc.setFontSize(10);
  rows.forEach((row, i) => {
    const col = i % 2;
    const rowIdx = Math.floor(i / 2);
    const x = margin + col * colW;
    const ry = y + rowIdx * 22;
    if (col === 0) {
      doc.setFillColor(rowIdx % 2 === 0 ? 250 : 245, rowIdx % 2 === 0 ? 250 : 245, rowIdx % 2 === 0 ? 252 : 248);
      doc.rect(margin, ry - 4, pageW - margin * 2, 22, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 110, 110);
    doc.text(row[0], x + 8, ry + 10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(row[1], x + colW - 8, ry + 10, { align: "right" });
  });
  y += Math.ceil(rows.length / 2) * 22 + 16;

  // Notes
  if (data.notes && data.notes.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text("NOTES", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const noteLines = doc.splitTextToSize(data.notes, pageW - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 13 + 10;
  }

  // Disclaimer footer
  const footerY = doc.internal.pageSize.getHeight() - 60;
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, footerY, pageW - margin, footerY);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  const disc = "Disclaimer: MatriCare is a decision-support tool, not a substitute for professional medical advice. Always consult your healthcare provider for diagnosis and treatment.";
  const discLines = doc.splitTextToSize(disc, pageW - margin * 2);
  doc.text(discLines, margin, footerY + 14);

  return doc;
}

export function downloadReportPdf(data: ReportData) {
  const doc = generateReportPdf(data);
  const safeName = (data.patient_name || "patient").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  doc.save(`matricare_report_${safeName}_${data.id.slice(0, 8)}.pdf`);
}
