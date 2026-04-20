# Machine Learning Pipeline

This folder is the **Python side** of the project. The web app (TypeScript) only
runs inference on `model.json` — all training happens here in Python (Colab /
Jupyter / local), exactly as a normal ML final-year project would.

## Files

```
ml/
├── data/
│   └── maternal_risk_merged.csv     # Cleaned, merged training data (2,640 rows)
├── scripts/
│   ├── merge_datasets.py            # Combines the 3 raw CSVs into the merged file
│   └── train_model.py               # Trains Random Forest, exports model.json
└── model/
    ├── model.json                   # Created after training — copy to src/ml/
    └── metrics.txt                  # Accuracy / Precision / Recall / F1
```

## Final feature schema

| Feature             | Description                       | Source datasets |
|---------------------|-----------------------------------|-----------------|
| Age                 | Years                             | all 3           |
| SystolicBP          | mmHg                              | all 3           |
| DiastolicBP         | mmHg                              | all 3           |
| BS                  | Blood sugar (mmol/L)              | all 3           |
| BodyTemp            | °F                                | all 3           |
| HeartRate           | bpm                               | all 3           |
| BMI                 | kg/m²                             | Dataset 2       |
| Hemoglobin          | g/dL                              | Dataset 3       |
| Diabetes            | 0 / 1 (pre-existing OR gestational)| Dataset 2       |
| PrevComplications   | 0 / 1                             | Dataset 2       |
| **Risk** (target)   | low / mid / high                  | all 3 (normalized) |

> Note for the report: your original spec mentioned `Parity`, `Prev_CSection`,
> and `ANC_Visits`. None of the three uploaded datasets contain those columns,
> so we use the richer, real columns above instead. State this clearly in your
> dissertation — it's standard practice and is more defensible than fabricated
> data.

## How to run (Colab or local)

```bash
python3 -m pip install pandas numpy scikit-learn
python3 ml/scripts/train_model.py
```

This produces `ml/model/model.json`. Copy it into the web app:

```bash
cp ml/model/model.json src/ml/model.json
```

The web app then loads it and runs Random Forest inference directly in the
browser/server — no Python needed at runtime.
