import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { predictRisk } from "@/lib/ml/predict.server";

// Returns endpoint + headers for AI calls.
// Prefers Lovable AI Gateway (LOVABLE_API_KEY, available on deployed Lovable),
// falls back to direct Google Gemini (GEMINI_API_KEY) for local/VS Code runs.
function getAIEndpoint(): {
  endpoint: string;
  headers: Record<string, string>;
  model: string;
} {
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (lovableKey) {
    return {
      endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      model: "google/gemini-2.5-flash",
    };
  }
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return {
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      headers: { Authorization: `Bearer ${geminiKey}`, "Content-Type": "application/json" },
      model: "gemini-2.5-flash",
    };
  }
  throw new Error(
    "No AI key configured. Set LOVABLE_API_KEY (Lovable) or GEMINI_API_KEY (local, from https://aistudio.google.com/apikey) in .env.local"
  );
}

// ===== AI PDF EXTRACTION =====
const ExtractInput = z.object({
  pdfBase64: z.string().min(10).max(15_000_000),
  mimeType: z.string().default("application/pdf"),
});

const ExtractedSchema = z.object({
  patient_name: z.string().nullish(),
  age: z.number().nullish(),
  systolic_bp: z.number().nullish(),
  diastolic_bp: z.number().nullish(),
  bs: z.number().nullish().describe("Blood sugar in mmol/L"),
  body_temp: z.number().nullish().describe("Body temperature in Fahrenheit"),
  heart_rate: z.number().nullish(),
  bmi: z.number().nullish(),
  hemoglobin: z.number().nullish().describe("Hemoglobin in g/dL"),
  diabetes: z.number().min(0).max(1).nullish(),
  prev_complications: z.number().min(0).max(1).nullish(),
}).transform((d) => ({
  patient_name: d.patient_name ?? null,
  age: d.age ?? null,
  systolic_bp: d.systolic_bp ?? null,
  diastolic_bp: d.diastolic_bp ?? null,
  bs: d.bs ?? null,
  body_temp: d.body_temp ?? null,
  heart_rate: d.heart_rate ?? null,
  bmi: d.bmi ?? null,
  hemoglobin: d.hemoglobin ?? null,
  diabetes: d.diabetes ?? null,
  prev_complications: d.prev_complications ?? null,
}));

export const extractFromPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ExtractInput.parse(input))
  .handler(async ({ data }) => {
    const { endpoint, headers } = getAIEndpoint();

    const systemPrompt = `You are a clinical data extractor for MATERNAL health reports (the pregnant mother — NEVER the fetus).
Extract these fields. Reports vary wildly: typed, scanned, handwritten, tabular, ultrasound reports, lab printouts. Be tolerant and infer sensibly.
Return numeric values only. If a field is genuinely not present or cannot be inferred, return null. Never invent values.

CRITICAL RULES:
- Ignore FETAL vitals (fetal heart rate, BPD, HC, AC, FL, EFW, gestational age). Those are NOT the mother's vitals.
- "Heart rate", "pulse", "HR" refers to the MOTHER unless explicitly labeled "fetal".
- Blood pressure: if a single number is given (e.g. "BP 150" or "Blood Pressure 150"), treat it as systolic_bp and leave diastolic_bp null.
  If "150/90" format, systolic=150, diastolic=90.
- If two ages appear (table row + handwritten), prefer the handwritten/header one near the patient name.

Fields:
- patient_name (mother's name; string or null)
- age (mother's age in years)
- systolic_bp (mmHg)
- diastolic_bp (mmHg)
- bs (blood sugar in mmol/L; if mg/dL given, divide by 18; "RBS"/"FBS"/"glucose" all count)
- body_temp (Fahrenheit; if Celsius given, convert: F = C*9/5+32)
- heart_rate (mother's heart rate in bpm — NOT fetal)
- bmi (kg/m^2; if height & weight given, compute weight_kg / (height_m^2))
- hemoglobin (g/dL; "Hb"/"Hgb" also)
- diabetes (1 if mother has diabetes / gestational diabetes, else 0; null if unknown)
- prev_complications (1 if previous pregnancy complications, prior C-section, or parity issues mentioned, else 0; null if unknown)`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the maternal health vitals from this hospital report." },
              { type: "image_url", image_url: { url: `data:${data.mimeType};base64,${data.pdfBase64}` } },
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
                  patient_name: { type: "string", nullable: true },
                  age: { type: "number", nullable: true },
                  systolic_bp: { type: "number", nullable: true },
                  diastolic_bp: { type: "number", nullable: true },
                  bs: { type: "number", nullable: true },
                  body_temp: { type: "number", nullable: true },
                  heart_rate: { type: "number", nullable: true },
                  bmi: { type: "number", nullable: true },
                  hemoglobin: { type: "number", nullable: true },
                  diabetes: { type: "number", nullable: true },
                  prev_complications: { type: "number", nullable: true },
                },
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
      throw new Error(`AI extraction failed (${res.status}): ${errText.slice(0, 300)}`);
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

// ===== CHATBOT =====
const ChatInput = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(4000),
  })).min(1).max(50),
  language: z.enum(["en", "kn", "hi", "te", "ta", "ml"]).default("en"),
});

const LANG_NAMES: Record<string, string> = {
  en: "English",
  kn: "Kannada (ಕನ್ನಡ)",
  hi: "Hindi (हिन्दी)",
  te: "Telugu (తెలుగు)",
  ta: "Tamil (தமிழ்)",
  ml: "Malayalam (മലയാളം)",
};

export const chatWithAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const { endpoint, headers } = getAIEndpoint();

    const langName = LANG_NAMES[data.language] ?? "English";
    const systemPrompt = `You are MatriCare's compassionate pregnancy assistant. You help expecting mothers with:
- General pregnancy questions (nutrition, exercise, symptoms, trimester guidance)
- Understanding maternal health vitals (BP, blood sugar, BMI, hemoglobin)
- When to consult a doctor

LANGUAGE: Always reply in ${langName}. Use the native script for that language. Medical/clinical terms may stay in English in parentheses if helpful. If the user writes in another language, still answer in ${langName} unless they explicitly request otherwise.

Guidelines:
- Be warm, supportive, and easy to understand. Use simple language.
- Always remind users you are NOT a doctor and they should consult their healthcare provider for medical decisions.
- For symptoms suggesting emergency (severe headache, vision changes, heavy bleeding, severe abdominal pain, no fetal movement), urge them to seek immediate medical care.
- Use markdown for clarity (bold, bullet points). Keep replies concise (under 250 words).
- If asked something outside pregnancy/maternal health, gently redirect.`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...data.messages],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Chat AI error:", res.status, errText);
      if (res.status === 429) throw new Error("Too many messages — please wait a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`Chat failed (${res.status})`);
    }

    const json = await res.json();
    const reply = json.choices?.[0]?.message?.content;
    if (!reply) throw new Error("No response from AI");
    return { reply };
  });
