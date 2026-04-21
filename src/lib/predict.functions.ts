import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { predictRisk } from "@/lib/ml/predict.server";

// ===== AI PDF EXTRACTION =====
const ExtractInput = z.object({
  pdfBase64: z.string().min(10).max(15_000_000), // raw base64 of PDF, ~15MB max
  mimeType: z.string().default("application/pdf"),
});

const ExtractedSchema = z.object({
  patient_name: z.string().nullable(),
  age: z.number().nullable(),
  systolic_bp: z.number().nullable(),
  diastolic_bp: z.number().nullable(),
  bs: z.number().nullable().describe("Blood sugar in mmol/L"),
  body_temp: z.number().nullable().describe("Body temperature in Fahrenheit"),
  heart_rate: z.number().nullable(),
  bmi: z.number().nullable(),
  hemoglobin: z.number().nullable().describe("Hemoglobin in g/dL"),
  diabetes: z.number().min(0).max(1).nullable(),
  prev_complications: z.number().min(0).max(1).nullable(),
});

export const extractFromPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ExtractInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a clinical data extractor for maternal health hospital reports.
Extract these fields from the report (PDF may be typed text or scanned/handwritten image).
Return numeric values only. If a field is not present or unclear, return null.

Fields:
- patient_name (string or null)
- age (years)
- systolic_bp (mmHg)
- diastolic_bp (mmHg)
- bs (blood sugar in mmol/L; if mg/dL given, divide by 18)
- body_temp (Fahrenheit; if Celsius given, convert: F = C*9/5+32)
- heart_rate (bpm)
- bmi (kg/m^2; if height & weight given, compute weight_kg / (height_m^2))
- hemoglobin (g/dL)
- diabetes (1 if patient has diabetes / gestational diabetes, else 0; null if unknown)
- prev_complications (1 if previous pregnancy complications mentioned, else 0; null if unknown)`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the maternal health vitals from this hospital report." },
              {
                type: "image_url",
                image_url: { url: `data:${data.mimeType};base64,${data.pdfBase64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_extracted_vitals",
              description: "Submit extracted maternal health vitals",
              parameters: {
                type: "object",
                properties: {
                  patient_name: { type: ["string", "null"] },
                  age: { type: ["number", "null"] },
                  systolic_bp: { type: ["number", "null"] },
                  diastolic_bp: { type: ["number", "null"] },
                  bs: { type: ["number", "null"] },
                  body_temp: { type: ["number", "null"] },
                  heart_rate: { type: ["number", "null"] },
                  bmi: { type: ["number", "null"] },
                  hemoglobin: { type: ["number", "null"] },
                  diabetes: { type: ["number", "null"], enum: [0, 1, null] },
                  prev_complications: { type: ["number", "null"], enum: [0, 1, null] },
                },
                required: [
                  "patient_name", "age", "systolic_bp", "diastolic_bp", "bs",
                  "body_temp", "heart_rate", "bmi", "hemoglobin", "diabetes", "prev_complications",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_extracted_vitals" } },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI gateway error:", res.status, errText);
      if (res.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in workspace settings.");
      throw new Error(`AI extraction failed (${res.status})`);
    }

    const json = await res.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response:", JSON.stringify(json).slice(0, 500));
      throw new Error("AI did not return structured data");
    }

    const args = JSON.parse(toolCall.function.arguments);
    const parsed = ExtractedSchema.parse(args);
    return { extracted: parsed };
  });

// ===== RISK PREDICTION + SAVE =====
const PredictInput = z.object({
  age: z.number().min(10).max(70),
  systolic_bp: z.number().min(50).max(250),
  diastolic_bp: z.number().min(30).max(180),
  bs: z.number().min(2).max(30),
  body_temp: z.number().min(90).max(110),
  heart_rate: z.number().min(30).max(220),
  bmi: z.number().min(10).max(60),
  hemoglobin: z.number().min(4).max(20),
  diabetes: z.number().min(0).max(1),
  prev_complications: z.number().min(0).max(1),
  patient_name: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  pdf_path: z.string().max(500).optional().nullable(),
});

export const predictAndSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PredictInput.parse(input))
  .handler(async ({ data, context }) => {
    const result = predictRisk(data);
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("predictions")
      .insert({
        user_id: userId,
        age: Math.round(data.age),
        systolic_bp: Math.round(data.systolic_bp),
        diastolic_bp: Math.round(data.diastolic_bp),
        bs: data.bs,
        body_temp: data.body_temp,
        heart_rate: Math.round(data.heart_rate),
        bmi: data.bmi,
        hemoglobin: data.hemoglobin,
        diabetes: data.diabetes,
        prev_complications: data.prev_complications,
        risk_level: result.risk_level,
        probability: result.probability,
        patient_name: data.patient_name ?? null,
        notes: data.notes ?? null,
        pdf_path: data.pdf_path ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      throw new Error(`Failed to save prediction: ${error.message}`);
    }

    return { ...result, id: row.id };
  });
