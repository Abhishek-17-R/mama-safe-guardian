// Server-side Random Forest inference. Loads model.json at build time.
// Model is a multi-tree classifier with arrays: feature, threshold, left, right, value.
import modelJsonRaw from "../../../ml/model/model.json?raw";

interface Tree {
  feature: number[];
  threshold: number[];
  left: number[];
  right: number[];
  value: number[][]; // per-node class probabilities
}

interface Model {
  type: string;
  features: string[];
  labels: string[];
  n_classes: number;
  trees: Tree[];
}

let cachedModel: Model | null = null;

function getModel(): Model {
  if (!cachedModel) cachedModel = JSON.parse(modelJsonRaw) as Model;
  return cachedModel;
}

function predictTree(tree: Tree, x: number[]): number[] {
  let node = 0;
  while (tree.feature[node] !== -2) {
    if (x[tree.feature[node]] <= tree.threshold[node]) {
      node = tree.left[node];
    } else {
      node = tree.right[node];
    }
  }
  return tree.value[node];
}

export interface RiskInput {
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
}

export interface RiskOutput {
  risk_level: "low" | "mid" | "high";
  probability: number;
  probabilities: { low: number; mid: number; high: number };
}

export function predictRisk(input: RiskInput): RiskOutput {
  const model = getModel();
  // Order must match model.features
  const x = [
    input.age,
    input.systolic_bp,
    input.diastolic_bp,
    input.bs,
    input.body_temp,
    input.heart_rate,
    input.bmi,
    input.hemoglobin,
    input.diabetes,
    input.prev_complications,
  ];

  const totals = new Array(model.n_classes).fill(0);
  for (const tree of model.trees) {
    const probs = predictTree(tree, x);
    for (let i = 0; i < model.n_classes; i++) totals[i] += probs[i];
  }
  const avg = totals.map((v) => v / model.trees.length);
  let bestIdx = 0;
  for (let i = 1; i < avg.length; i++) if (avg[i] > avg[bestIdx]) bestIdx = i;

  return {
    risk_level: model.labels[bestIdx] as "low" | "mid" | "high",
    probability: Number(avg[bestIdx].toFixed(4)),
    probabilities: {
      low: Number(avg[0].toFixed(4)),
      mid: Number(avg[1].toFixed(4)),
      high: Number(avg[2].toFixed(4)),
    },
  };
}
