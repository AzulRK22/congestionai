"use client";
export type HistoryItem = {
  origin: string;
  destination: string;
  bestISO: string;
  eta: number;
  savedAt: number;
};
const KEY = "congestion_history_v1";
export function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
export function saveHistoryItem(item: HistoryItem) {
  const arr = loadHistory();
  arr.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 50)));
}
