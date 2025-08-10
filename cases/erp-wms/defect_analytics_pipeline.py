import pandas as pd

# Load a simplified defect export
df = pd.read_csv("defects_sample.csv")  # (issue_id, created, component, summary, status)

# Feature ideas: age (days), component hotness, simple duplicate hint by token overlap
df["created"] = pd.to_datetime(df["created"], errors="coerce")
df["age_days"] = (pd.Timestamp.utcnow() - df["created"]).dt.days

hot = df.groupby("component")["issue_id"].count().sort_values(ascending=False)
hot_components = hot[hot > hot.median()].index.tolist()
df["component_hot"] = df["component"].isin(hot_components).astype(int)

# Tiny dupe signal (NLP-lite): same component & high token overlap
def tokens(s): return set(str(s).lower().split())
dup_flags = []
for i, row in df.iterrows():
    cand = df[(df["component"] == row["component"]) & (df["issue_id"] != row["issue_id"])]
    score = cand["summary"].apply(lambda s: len(tokens(s) & tokens(row["summary"])) / max(1,len(tokens(s)|tokens(row["summary"]))))
    dup_flags.append(1 if (score > 0.6).any() else 0)
df["dupe_hint"] = dup_flags

df[["issue_id","component","age_days","component_hot","dupe_hint","summary"]].to_csv("defects_triage_view.csv", index=False)
print("Wrote defects_triage_view.csv")
