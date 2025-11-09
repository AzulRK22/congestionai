// app/forecast/page.tsx
import { Suspense } from "react";
import ForecastClient from "./forecast-client";

// Evita SSG aquí para que no truene el prerender con CSR bailout
export const dynamic = "force-dynamic";

export default function ForecastPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-slate-500">Cargando forecast…</div>
      }
    >
      <ForecastClient />
    </Suspense>
  );
}
