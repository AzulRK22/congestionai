"use client";
export function Heatmap({
  data,
}: {
  data: { hourOfWeek: number; risk: number }[];
}) {
  const cells = data || [];
  return (
    <div
      className="grid gap-0.5"
      style={{ gridTemplateColumns: "repeat(24, minmax(0,1fr))" }}
    >
      {cells.map((c, idx) => {
        const intensity = Math.round(c.risk * 100);
        return (
          <div
            key={idx}
            title={`h${c.hourOfWeek} risk ${intensity}%`}
            className="w-3 h-3 rounded-sm"
            style={{ background: `hsl(0 70% ${30 + intensity * 0.5}%)` }}
          />
        );
      })}
    </div>
  );
}
