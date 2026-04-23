// Pure helper to flag abnormal maternal vitals and suggest actions.
// All thresholds are general guidance — UI should always pair with a "consult your doctor" disclaimer.

export type Severity = "high" | "warn";

export interface RiskFlag {
  label: string;       // e.g. "Blood Pressure"
  value: string;       // e.g. "150/95 mmHg"
  issue: string;       // what's wrong
  advice: string;      // what to do
  severity: Severity;
}

export interface VitalsForInsights {
  age: number;
  systolic_bp: number;
  diastolic_bp: number;
  bs: number;          // mmol/L
  body_temp: number;   // F
  heart_rate: number;
  bmi: number;
  hemoglobin: number;  // g/dL
  diabetes: number;    // 0/1
  prev_complications: number; // 0/1
}

export function getRiskInsights(v: VitalsForInsights): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Blood pressure
  if (v.systolic_bp >= 160 || v.diastolic_bp >= 110) {
    flags.push({
      label: "Blood Pressure",
      value: `${v.systolic_bp}/${v.diastolic_bp} mmHg`,
      issue: "Severely elevated — risk of pre-eclampsia.",
      advice: "Seek urgent obstetric care today. Rest on your left side and monitor for headache, vision changes, or swelling.",
      severity: "high",
    });
  } else if (v.systolic_bp >= 140 || v.diastolic_bp >= 90) {
    flags.push({
      label: "Blood Pressure",
      value: `${v.systolic_bp}/${v.diastolic_bp} mmHg`,
      issue: "High (gestational hypertension range).",
      advice: "Schedule a checkup within 1–2 days. Reduce salt, stay hydrated, and rest more.",
      severity: "warn",
    });
  } else if (v.systolic_bp < 90 || v.diastolic_bp < 60) {
    flags.push({
      label: "Blood Pressure",
      value: `${v.systolic_bp}/${v.diastolic_bp} mmHg`,
      issue: "Low — may cause dizziness or fainting.",
      advice: "Hydrate well, rise slowly, eat small frequent meals. Tell your doctor if you feel faint.",
      severity: "warn",
    });
  }

  // Blood sugar (mmol/L)
  if (v.bs >= 11) {
    flags.push({
      label: "Blood Sugar",
      value: `${v.bs} mmol/L`,
      issue: "Very high — possible gestational diabetes.",
      advice: "Contact your doctor today for a glucose tolerance test. Avoid sugary foods and refined carbs.",
      severity: "high",
    });
  } else if (v.bs >= 7.8) {
    flags.push({
      label: "Blood Sugar",
      value: `${v.bs} mmol/L`,
      issue: "Above normal pregnancy range.",
      advice: "Discuss diet review with your doctor. Prefer whole grains, vegetables, and lean protein.",
      severity: "warn",
    });
  } else if (v.bs < 3.9) {
    flags.push({
      label: "Blood Sugar",
      value: `${v.bs} mmol/L`,
      issue: "Low blood sugar.",
      advice: "Eat a small carb snack now (fruit, juice). Mention to your doctor if it recurs.",
      severity: "warn",
    });
  }

  // Body temperature (F)
  if (v.body_temp >= 102) {
    flags.push({
      label: "Body Temperature",
      value: `${v.body_temp} °F`,
      issue: "High fever — may harm pregnancy.",
      advice: "Seek medical care today. Stay hydrated and avoid self-medication without doctor approval.",
      severity: "high",
    });
  } else if (v.body_temp >= 100.4) {
    flags.push({
      label: "Body Temperature",
      value: `${v.body_temp} °F`,
      issue: "Mild fever.",
      advice: "Rest, drink fluids, and call your doctor if it persists more than 24 hours.",
      severity: "warn",
    });
  }

  // Heart rate
  if (v.heart_rate >= 120) {
    flags.push({
      label: "Heart Rate",
      value: `${v.heart_rate} bpm`,
      issue: "Tachycardia — heart working too hard.",
      advice: "Rest and contact your doctor. If accompanied by chest pain or breathlessness, seek emergency care.",
      severity: "high",
    });
  } else if (v.heart_rate >= 100) {
    flags.push({
      label: "Heart Rate",
      value: `${v.heart_rate} bpm`,
      issue: "Mildly elevated.",
      advice: "Some increase is normal in pregnancy. Mention at your next checkup if persistent.",
      severity: "warn",
    });
  } else if (v.heart_rate < 55) {
    flags.push({
      label: "Heart Rate",
      value: `${v.heart_rate} bpm`,
      issue: "Lower than expected.",
      advice: "If you feel dizzy or weak, contact your doctor.",
      severity: "warn",
    });
  }

  // Hemoglobin
  if (v.hemoglobin < 8) {
    flags.push({
      label: "Hemoglobin",
      value: `${v.hemoglobin} g/dL`,
      issue: "Severe anemia.",
      advice: "Urgent doctor visit — iron supplementation or treatment may be required.",
      severity: "high",
    });
  } else if (v.hemoglobin < 11) {
    flags.push({
      label: "Hemoglobin",
      value: `${v.hemoglobin} g/dL`,
      issue: "Anemia (low for pregnancy).",
      advice: "Eat iron-rich foods (leafy greens, lentils, eggs, lean meat). Ask doctor about iron + folate supplements.",
      severity: "warn",
    });
  }

  // BMI
  if (v.bmi >= 35) {
    flags.push({
      label: "BMI",
      value: `${v.bmi} kg/m²`,
      issue: "Severe obesity — higher pregnancy risks.",
      advice: "Discuss a supervised nutrition and gentle activity plan with your obstetrician.",
      severity: "high",
    });
  } else if (v.bmi >= 30) {
    flags.push({
      label: "BMI",
      value: `${v.bmi} kg/m²`,
      issue: "Obesity range.",
      advice: "Aim for balanced meals and doctor-approved gentle exercise (walking, prenatal yoga).",
      severity: "warn",
    });
  } else if (v.bmi < 18.5) {
    flags.push({
      label: "BMI",
      value: `${v.bmi} kg/m²`,
      issue: "Underweight — may affect fetal growth.",
      advice: "Increase calorie-dense, nutrient-rich foods. Discuss a weight-gain plan with your doctor.",
      severity: "warn",
    });
  }

  // Age
  if (v.age >= 35) {
    flags.push({
      label: "Maternal Age",
      value: `${v.age} years`,
      issue: "Advanced maternal age — slightly higher risk profile.",
      advice: "Keep regular antenatal visits and any recommended screenings.",
      severity: "warn",
    });
  } else if (v.age < 18) {
    flags.push({
      label: "Maternal Age",
      value: `${v.age} years`,
      issue: "Young maternal age — needs close monitoring.",
      advice: "Attend all prenatal visits and ask about nutritional support.",
      severity: "warn",
    });
  }

  // Diabetes flag
  if (v.diabetes === 1) {
    flags.push({
      label: "Diabetes",
      value: "Present",
      issue: "Diabetes during pregnancy increases complications.",
      advice: "Follow your glucose monitoring plan strictly and attend all endocrinology / OB visits.",
      severity: "warn",
    });
  }

  // Previous complications
  if (v.prev_complications === 1) {
    flags.push({
      label: "Previous Complications",
      value: "Yes",
      issue: "Past pregnancy complications raise current risk.",
      advice: "Ensure your OB knows the full history. Don't skip scans or follow-ups.",
      severity: "warn",
    });
  }

  return flags;
}

export function getGeneralAdvice(level: "low" | "mid" | "high"): string[] {
  if (level === "high") {
    return [
      "Contact your obstetrician today — do not wait for the next scheduled visit.",
      "Watch for warning signs: severe headache, blurred vision, swelling of face/hands, reduced fetal movement, heavy bleeding, severe abdominal pain. Go to the ER if any appear.",
      "Rest, stay hydrated, and avoid strenuous activity until reviewed.",
      "Bring this report and your recent vitals to your appointment.",
    ];
  }
  if (level === "mid") {
    return [
      "Book a checkup within the next few days to review the flagged vitals.",
      "Continue prenatal vitamins and a balanced diet (protein, leafy greens, whole grains).",
      "Light activity (walking, prenatal yoga) most days, with doctor's approval.",
      "Monitor BP and blood sugar at home if your doctor advises.",
    ];
  }
  return [
    "Keep up with routine prenatal checkups and recommended scans.",
    "Maintain a balanced diet and stay well hydrated.",
    "Light daily activity and adequate sleep support a healthy pregnancy.",
    "Continue prenatal vitamins as prescribed.",
  ];
}
