import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_app/predict")({
  head: () => ({ meta: [{ title: "New Assessment — MatriCare" }] }),
  component: PredictPage,
});

function PredictPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-6 w-6" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-foreground">New Assessment</h1>
        <p className="mt-2 text-muted-foreground">
          PDF upload + AI extraction + risk prediction coming in phase 2.
        </p>
      </div>
    </div>
  );
}
