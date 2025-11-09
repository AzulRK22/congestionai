import { Suspense } from "react";
import HistoryClient from "./history-client";

export default function Page() {
  return (
    <section className="py-6 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">History</h1>
      <Suspense
        fallback={
          <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
        }
      >
        <HistoryClient />
      </Suspense>
    </section>
  );
}
