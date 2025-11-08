"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { SectionCard } from "@/components/ui/SectionCard";
import { PlannerForm } from "@/components/PlannerForm";

export default function Page() {
  const router = useRouter();
  const sp = useSearchParams();

  return (
    <section className="py-6 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Planear salida óptima
      </h1>

      <SectionCard>
        <PlannerForm
          initialOrigin={sp.get("origin") ?? ""}
          initialDestination={sp.get("destination") ?? ""}
          onSubmit={(o, d) =>
            router.push(
              `/result?origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}`,
            )
          }
        />
      </SectionCard>
    </section>
  );
}
