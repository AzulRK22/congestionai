import { Suspense } from "react";
import ResultClient from "./result-client";

export default function Page() {
  return (
    <section className="space-y-6">
      <Suspense
        fallback={
          <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
        }
      >
        <ResultClient />
      </Suspense>
    </section>
  );
}
