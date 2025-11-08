import { z } from "zod";

export const PlanRequest = z.object({
  origin: z.string().min(3),
  destination: z.string().min(3),
  city: z.string().default("CDMX"),
  window: z.enum(["next72","now"]).default("next72")
});
export type PlanRequest = z.infer<typeof PlanRequest>;

export const Suggestion = z.object({
  departAtISO: z.string(),
  etaMin: z.number(),
  savingVsNow: z.number(),
  riskBand: z.tuple([z.number(), z.number()])
});
export type Suggestion = z.infer<typeof Suggestion>;

export const PlanResponse = z.object({
  best: Suggestion,
  alternatives: z.array(Suggestion),
  etaNow: z.number(),
  distanceKm: z.number(),
  heatmap: z.array(z.object({ hourOfWeek:z.number(), risk:z.number() })),
  notes: z.array(z.string())
});
export type PlanResponse = z.infer<typeof PlanResponse>;
