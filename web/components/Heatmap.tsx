"use client";
export function Heatmap({
  data,
}: {
  data: { hourOfWeek: number; risk: number }[];
}) {
  const cells = data || [];
  return (
    <div className="space-y-2">
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: "repeat(24, minmax(0,1fr))" }}
      >
        {cells.map((c, idx) => {
          const intensity = Math.round(c.risk * 100);
          return (
            <div
              key={idx}
              title={`h${c.hourOfWeek} · riesgo ${intensity}%`}
              className="w-3 h-3 rounded-sm"
              style={{ background: `hsl(0 70% ${30 + intensity * 0.5}%)` }}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>00h</span>
        <span>06h</span>
        <span>12h</span>
        <span>18h</span>
        <span>24h</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500">Bajo</span>
        <div
          className="h-2 flex-1 rounded"
          style={{
            background:
              "linear-gradient(to right, hsl(0 70% 30%), hsl(0 70% 80%))",
          }}
        />
        <span className="text-[10px] text-slate-500">Alto</span>
      </div>
    </div>
  );
}
