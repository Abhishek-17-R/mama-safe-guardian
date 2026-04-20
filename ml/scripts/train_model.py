"""
Train a Random Forest classifier on the merged maternal-risk dataset
and export it as model.json so the web app can run inference in JS.

Run:
    python3 -m pip install pandas scikit-learn numpy
    python3 ml/scripts/train_model.py

Outputs:
    ml/model/model.json     <- used by the web app
    ml/model/metrics.txt    <- accuracy / precision / recall / F1 for your report
"""
import json, os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (accuracy_score, precision_score,
                             recall_score, f1_score, classification_report,
                             confusion_matrix)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
DATA = os.path.join(ROOT, "data", "maternal_risk_merged.csv")
OUT_DIR = os.path.join(ROOT, "model")
os.makedirs(OUT_DIR, exist_ok=True)

FEATURES = ["Age","SystolicBP","DiastolicBP","BS","BodyTemp","HeartRate",
            "BMI","Hemoglobin","Diabetes","PrevComplications"]
LABELS = ["low","mid","high"]

df = pd.read_csv(DATA)
X = df[FEATURES].values
y = df["Risk"].map({"low":0,"mid":1,"high":2}).values

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2,
                                          stratify=y, random_state=42)

clf = RandomForestClassifier(
    n_estimators=200, max_depth=None, min_samples_leaf=2,
    class_weight="balanced", random_state=42, n_jobs=-1,
)
clf.fit(X_tr, y_tr)
pred = clf.predict(X_te)

acc  = accuracy_score(y_te, pred)
prec = precision_score(y_te, pred, average="weighted", zero_division=0)
rec  = recall_score(y_te, pred, average="weighted", zero_division=0)
f1   = f1_score(y_te, pred, average="weighted", zero_division=0)

print(f"Accuracy : {acc:.4f}")
print(f"Precision: {prec:.4f}")
print(f"Recall   : {rec:.4f}")
print(f"F1-score : {f1:.4f}\n")
print(classification_report(y_te, pred, target_names=LABELS, zero_division=0))

with open(os.path.join(OUT_DIR, "metrics.txt"), "w") as f:
    f.write(f"Accuracy : {acc:.4f}\nPrecision: {prec:.4f}\n"
            f"Recall   : {rec:.4f}\nF1-score : {f1:.4f}\n\n")
    f.write(classification_report(y_te, pred, target_names=LABELS, zero_division=0))
    f.write("\nConfusion matrix (rows=true, cols=pred):\n")
    f.write(str(confusion_matrix(y_te, pred)))

# ---------- Export every tree as JSON ----------
def tree_to_dict(t):
    return {
        "feature":   t.feature.tolist(),
        "threshold": t.threshold.tolist(),
        "left":      t.children_left.tolist(),
        "right":     t.children_right.tolist(),
        "value":     t.value.squeeze(axis=1).tolist(),  # [n_nodes, n_classes]
    }

model_json = {
    "type": "RandomForestClassifier",
    "features": FEATURES,
    "labels": LABELS,
    "n_classes": 3,
    "trees": [tree_to_dict(est.tree_) for est in clf.estimators_],
    "metrics": {"accuracy":acc, "precision":prec, "recall":rec, "f1":f1},
}

out = os.path.join(OUT_DIR, "model.json")
with open(out, "w") as f:
    json.dump(model_json, f)
print(f"\nWrote {out}  ({os.path.getsize(out)//1024} KB, {len(clf.estimators_)} trees)")
print("Copy this file to:  src/ml/model.json   (the web app reads it from there)")
