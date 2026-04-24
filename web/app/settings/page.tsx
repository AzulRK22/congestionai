// web/app/settings/page.tsx
import { Suspense } from "react";
import SettingsClient from "./settings-client";

export default function Page() {
  return (
    <section className="space-y-6">
      <Suspense
        fallback={
          <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
        }
      >
        <SettingsClient />
      </Suspense>
    </section>
  );
}
