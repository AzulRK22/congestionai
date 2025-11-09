// web/lib/storage.ts
export type HistoryItem = {
  id: string;
  origin: string;
  destination: string;
  bestISO: string; // salida óptima (ISO)
  eta: number; // ETA minutos (mejor)
  savedAt: number; // epoch ms
  pinned?: boolean;
  // NUEVO (opcionales; mantiene compatibilidad con lo ya guardado):
  baselineEta?: number; // ETA "sin optimizar"
  savingPct?: number; // % ahorro vs baseline (0..100)
};

const KEY = "congestion_history_v1";

function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function loadAll(): HistoryItem[] {
  const list = safeParse<HistoryItem[]>(localStorage.getItem(KEY));
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (x) =>
        x &&
        typeof x.origin === "string" &&
        typeof x.destination === "string" &&
        typeof x.bestISO === "string" &&
        typeof x.eta === "number" &&
        typeof x.savedAt === "number",
    )
    .sort(
      (a, b) =>
        (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.savedAt - a.savedAt,
    );
}

function saveAll(list: HistoryItem[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function makeId(origin: string, destination: string, bestISO?: string): string {
  const key = `${origin}|${destination}|${bestISO ?? ""}`.toLowerCase();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return String(h);
}

export function getHistory(): HistoryItem[] {
  return loadAll();
}

export function saveHistoryItem(item: {
  origin: string;
  destination: string;
  bestISO: string;
  eta: number;
  savedAt?: number;
  baselineEta?: number;
  savingPct?: number; // 0..100
}) {
  // completa baseline/saving si falta uno de los dos
  let { baselineEta, savingPct } = item;
  if (baselineEta == null && typeof savingPct === "number") {
    const f = Math.max(0, Math.min(100, savingPct)) / 100;
    baselineEta = Math.round(item.eta / Math.max(0.05, 1 - f));
  } else if (
    savingPct == null &&
    typeof baselineEta === "number" &&
    baselineEta > 0
  ) {
    savingPct = Math.max(
      0,
      Math.min(100, Math.round(((baselineEta - item.eta) / baselineEta) * 100)),
    );
  }

  const list = loadAll();
  const id = makeId(item.origin, item.destination, item.bestISO);
  const next: HistoryItem = {
    id,
    origin: item.origin,
    destination: item.destination,
    bestISO: item.bestISO,
    eta: item.eta,
    savedAt: item.savedAt ?? Date.now(),
    pinned: list.find((x) => x.id === id)?.pinned ?? false,
    baselineEta,
    savingPct,
  };
  const idx = list.findIndex((x) => x.id === id);
  if (idx >= 0) list.splice(idx, 1, next);
  else list.unshift(next);
  saveAll(list);
}

export function removeHistoryItem(id: string) {
  saveAll(loadAll().filter((x) => x.id !== id));
}

export function togglePinHistory(id: string) {
  const list = loadAll().map((x) =>
    x.id === id ? { ...x, pinned: !x.pinned } : x,
  );
  list.sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.savedAt - a.savedAt,
  );
  saveAll(list);
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}

export function importHistory(items: HistoryItem[]) {
  const cur = loadAll();
  const map = new Map<string, HistoryItem>(cur.map((x) => [x.id, x]));
  for (const it of items) if (it?.id) map.set(it.id, it);
  const merged = Array.from(map.values()).sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.savedAt - a.savedAt,
  );
  saveAll(merged);
}

export function exportHistory(): string {
  return JSON.stringify(loadAll(), null, 2);
}
