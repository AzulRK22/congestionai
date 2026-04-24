// web/app/page.tsx
import { Suspense } from "react";
import HomeClient from "./home-client";

export default function Page() {
  return (
    <main className="space-y-6 pb-4">
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
