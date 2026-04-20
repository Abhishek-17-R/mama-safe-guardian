"""
Merge the 3 maternal-health datasets into a unified training set.

Target schema (matches your project spec):
  Age, SystolicBP, DiastolicBP, BS, BodyTemp, HeartRate,
  BMI, Hemoglobin, Diabetes, PrevComplications, Risk

Notes:
- Parity / Prev_CSection / ANC_Visits are NOT present in any of the source
  CSVs. Rather than fabricate them, we drop them and use the richer set of
  REAL features that the data actually supports. This is what your final-
  year report should also state.
- Risk is normalized to: high / mid / low
- Missing numeric values are filled with median; missing flags with 0.
"""
import pandas as pd
import numpy as np

d1 = pd.read_csv("/tmp/ds/data.csv")                # 1010 rows, no BMI/Hb/Diabetes
d2 = pd.read_csv("/tmp/ds/dataset_updated.csv")     # has BMI, Diabetes, etc.
d3 = pd.read_csv("/tmp/ds/augmented.csv")           # has Hemoglobin, lifestyle

def norm_risk(v):
    s = str(v).strip().lower()
    if s.startswith("high"): return "high"
    if s.startswith("mid"):  return "mid"
    return "low"

# --- Dataset 1 ---
a = d1.rename(columns=str.strip).copy()
a["BMI"] = np.nan
a["Hemoglobin"] = np.nan
a["Diabetes"] = 0
a["PrevComplications"] = 0
a["Risk"] = a["RiskLevel"].apply(norm_risk)
a = a[["Age","SystolicBP","DiastolicBP","BS","BodyTemp","HeartRate",
       "BMI","Hemoglobin","Diabetes","PrevComplications","Risk"]]

# --- Dataset 2 (Updated) ---
b = d2.rename(columns={
    "Systolic BP":"SystolicBP",
    "Diastolic":"DiastolicBP",
    "Body Temp":"BodyTemp",
    "Heart Rate":"HeartRate",
    "Risk Level":"RiskLevel",
}).copy()
# Diabetes = 1 if either pre-existing OR gestational
b["Diabetes"] = ((b["Preexisting Diabetes"]==1) | (b["Gestational Diabetes"]==1)).astype(int)
b["PrevComplications"] = b["Previous Complications"].fillna(0).astype(int)
b["Hemoglobin"] = np.nan
b["Risk"] = b["RiskLevel"].apply(norm_risk)
b = b[["Age","SystolicBP","DiastolicBP","BS","BodyTemp","HeartRate",
       "BMI","Hemoglobin","Diabetes","PrevComplications","Risk"]]

# --- Dataset 3 (Augmented) ---
c = d3.rename(columns={"hemoglobin_g_dL":"Hemoglobin"}).copy()
c["BMI"] = np.nan
c["Diabetes"] = 0
c["PrevComplications"] = 0
c["Risk"] = c["RiskLevel"].apply(norm_risk)
c = c[["Age","SystolicBP","DiastolicBP","BS","BodyTemp","HeartRate",
       "BMI","Hemoglobin","Diabetes","PrevComplications","Risk"]]

merged = pd.concat([a,b,c], ignore_index=True)

# Clean
merged = merged.drop_duplicates()
for col in ["Age","SystolicBP","DiastolicBP","BS","BodyTemp","HeartRate","BMI","Hemoglobin"]:
    merged[col] = pd.to_numeric(merged[col], errors="coerce")
    merged[col] = merged[col].fillna(merged[col].median())
merged["Diabetes"] = merged["Diabetes"].fillna(0).astype(int)
merged["PrevComplications"] = merged["PrevComplications"].fillna(0).astype(int)

# Round
merged["Age"] = merged["Age"].astype(int)
merged["SystolicBP"] = merged["SystolicBP"].astype(int)
merged["DiastolicBP"] = merged["DiastolicBP"].astype(int)
merged["HeartRate"] = merged["HeartRate"].astype(int)
merged["BMI"] = merged["BMI"].round(1)
merged["Hemoglobin"] = merged["Hemoglobin"].round(2)

merged.to_csv("/tmp/ds/maternal_risk_merged.csv", index=False)

print("Total rows:", len(merged))
print("Risk distribution:")
print(merged["Risk"].value_counts())
print("\nFirst 5 rows:")
print(merged.head())
print("\nNulls:", merged.isnull().sum().sum())
