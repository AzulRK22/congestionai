"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SectionCard } from "@/components/ui/SectionCard";
import { PlannerForm } from "@/components/PlannerForm";

export default function HomeClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const initialOrigin = sp.get("origin") ?? "";
  const initialDestination = sp.get("destination") ?? "";

  return (
    <SectionCard>
      <PlannerForm
        initialOrigin={initialOrigin}
        initialDestination={initialDestination}
        onSubmit={(o, d) =>
          router.push(
            `/result?origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}`,
          )
        }
      />
    </SectionCard>
  );
}
