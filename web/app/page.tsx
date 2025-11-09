// web/app/page.tsx
import { Suspense } from "react";
import HomeClient from "./home-client";

export default function Page() {
  return (
    <main className="py-6 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">CongestionAI</h1>
      <Suspense
        fallback={
          <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
        }
      >
        <HomeClient />
      </Suspense>
    </main>
  );
}
