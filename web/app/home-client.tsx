// web/app/home-client.tsx
"use client";

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
    <SectionCard>
      <PlannerForm onSubmit={handleSubmit} />
    </SectionCard>
  );
}
