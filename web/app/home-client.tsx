// web/app/home-client.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/ui/SectionCard";
import { PlannerForm, type PlanOptions } from "@/components/PlannerForm";

export default function HomeClient() {
  const router = useRouter();

  function handleSubmit(
    origin: string,
    destination: string,
    opts: PlanOptions,
  ) {
    const qs = new URLSearchParams({
      origin,
      destination,
      window: String(opts.windowMins),
      step: String(opts.stepMins),
      refine: opts.refine ? "1" : "0",
      offset: String(opts.departOffsetMin),
      avoidTolls: opts.avoidTolls ? "1" : "0",
      avoidHighways: opts.avoidHighways ? "1" : "0",
    });
    router.push(`/result?${qs.toString()}`);
  }

  return (
    <section className="space-y-6">
      <SectionCard className="hero-mesh">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-5">
            <span className="eyebrow">Departure intelligence</span>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 [font-family:var(--font-display)] sm:text-5xl">
                Leave at the right moment, not just the fastest route.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                CongestionAI compares departure windows, estimates ETA, flags
                route risk, and tells you when waiting a bit will actually save
                time, fuel, and stress.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/60 bg-white/65 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                  Decision
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  A clear go now vs wait recommendation.
                </div>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white/65 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                  Forecast
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  72h ETA trend to spot calmer windows ahead.
                </div>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white/65 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                  Savings
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Time, fuel, money and CO2 in one view.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5">
                Traffic-aware ETA sampling
              </span>
              <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5">
                Holiday-aware scoring
              </span>
              <Link
                href="/forecast"
                className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 hover:bg-white"
              >
                Explore 72h forecast
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-[rgba(255,255,255,0.78)] p-4 shadow-xl shadow-slate-900/5 md:p-5">
            <div className="mb-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                Plan a trip
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight [font-family:var(--font-display)]">
                Compare the next best departure windows
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Enter origin and destination, then we will calculate whether
                leaving now is worth it or if a short wait pays off.
              </p>
            </div>
            <PlannerForm onSubmit={handleSubmit} />
          </div>
        </div>
      </SectionCard>
    </section>
  );
}
