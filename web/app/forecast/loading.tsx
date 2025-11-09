// app/forecast/loading.tsx
export default function Loading() {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="h-5 w-40 mb-3 bg-slate-100 animate-pulse rounded" />
      <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
    </div>
  );
}
