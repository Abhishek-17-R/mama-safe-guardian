import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";

export const Route = createFileRoute("/_app/history")({
  head: () => ({ meta: [{ title: "History — MatriCare" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <History className="h-6 w-6" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-foreground">Your History</h1>
        <p className="mt-2 text-muted-foreground">Past assessments will appear here in phase 3.</p>
      </div>
    </div>
  );
}
