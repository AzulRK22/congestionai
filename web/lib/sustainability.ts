// web/lib/sustainability.ts
// Estimaciones rápidas de ahorro económico / combustible / CO₂ (demo-friendly)

export type SavingsUI = {
  pesos: number; // MXN ahorrados
  liters: number; // litros ahorrados
  kgCO2: number; // kg CO₂ evitados
};

// Si necesitas extras para otros cálculos, agrega un segundo export con más campos.
export function estimateSavings(args: {
  etaMin: number; // ETA elegido (min)
  savingVsNow: number; // 0..1 (e.g. 0.18 = 18% ahorro vs salir ahora)
  fuelPricePerL: number; // MXN/L
  carLper100km: number; // L/100km
  tripKm: number; // longitud estimada del trayecto
}): SavingsUI {
  const { etaMin, savingVsNow, fuelPricePerL, carLper100km, tripKm } = args;

  const baselineEta = savingVsNow > 0 ? etaMin / (1 - savingVsNow) : etaMin;
  const savedMin = Math.max(0, baselineEta - etaMin);
  const timeFactor = baselineEta > 0 ? savedMin / baselineEta : 0;

  const litersTrip = (carLper100km / 100) * tripKm;
  const savedLiters = litersTrip * timeFactor;

  const moneySaved = savedLiters * fuelPricePerL;
  const co2KgSaved = savedLiters * 2.31; // ~2.31 kg CO₂ / L gasolina

  const round2 = (x: number) => Math.round(x * 100) / 100;

  return {
    pesos: round2(moneySaved),
    liters: round2(savedLiters),
    kgCO2: round2(co2KgSaved),
  };
}
