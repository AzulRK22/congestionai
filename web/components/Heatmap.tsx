"use client";

import { useMemo, useState } from "react";

type HMPoint = {
  timeISO: string;
  etaMin: number;
  risk: number; // 0..1 approx
  isBest?: boolean;
};

type Props = {
  points: HMPoint[];
  nowISO?: string;
  chips?: string[]; // e.g. ["Holiday","Weekend"]
};

function riskColor(r: number) {
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  const t = clamp(r);
  // green → amber → red
  const from = [22, 163, 74]; // #16a34a
  const mid = [245, 158, 11]; // #f59e0b
  const to = [239, 68, 68]; // #ef4444
  const mix = (a: number[], b: number[], k: number) =>
    `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(
      a[1] + (b[1] - a[1]) * k,
    )},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
  return t < 0.5 ? mix(from, mid, t * 2) : mix(mid, to, (t - 0.5) * 2);
}

function fmtTime(iso?: string) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function riskLabel(r: number) {
  if (r < 0.33) return "Low";
  if (r < 0.66) return "Medium";
  return "High";
}

export function Heatmap({ points, nowISO, chips = [] }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const data = useMemo(() => {
    const arr = [...points].sort(
      (a, b) => new Date(a.timeISO).getTime() - new Date(b.timeISO).getTime(),
    );
    if (arr.length === 0) {
      return {
        arr,
        minEta: 0,
        maxEta: 0,
        bestIdx: -1,
        nowIdx: -1,
        savingsVsNow: 0,
      };
    }
    const minEta = Math.min(...arr.map((p) => p.etaMin));
    const maxEta = Math.max(...arr.map((p) => p.etaMin));
    const bestIdx = arr.reduce(
      (best, p, i) => (p.etaMin < arr[best].etaMin ? i : best),
      0,
    );
    const nowIdx = nowISO ? arr.findIndex((p) => p.timeISO === nowISO) : 0;
    const savingsVsNow =
      nowIdx >= 0 ? arr[nowIdx].etaMin - arr[bestIdx].etaMin : 0;

    return { arr, minEta, maxEta, bestIdx, nowIdx, savingsVsNow };
  }, [points, nowISO]);

  if (!data.arr.length) {
    return (
      <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-500">
        Add origin & destination to see departure suggestions.
      </div>
    );
  }

  const W = 680; // virtual width
  const H = 140;
  const PAD = 18;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const x = (i: number) =>
    PAD + (i * innerW) / Math.max(1, data.arr.length - 1);
  const y = (eta: number) => {
    const t = (eta - data.minEta) / Math.max(1, data.maxEta - data.minEta); // 0..1
    return PAD + innerH - t * innerH;
  };

  // ETA line
  const path = data.arr
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.etaMin)}`)
    .join(" ");

  // hover point (defaults to best)
  const hi = hoverIdx ?? data.bestIdx;
  const hp = data.arr[Math.max(0, hi)];

  // savings vs now
  const nowEta = data.nowIdx >= 0 ? data.arr[data.nowIdx].etaMin : hp.etaMin;
  const savedMin = Math.max(0, nowEta - hp.etaMin);

  return (
    <div className="space-y-2">
      {/* Context chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-slate-700 border-slate-200 bg-slate-50"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-white p-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Departure advisor chart"
        >
          {/* background by risk */}
          {data.arr.map((p, i) => {
            const nextX = i === data.arr.length - 1 ? x(i) : x(i + 1);
            const w = Math.max(1, nextX - x(i));
            return (
              <rect
                key={`bg-${i}`}
                x={x(i)}
                y={PAD}
                width={w}
                height={H - PAD * 2}
                fill={riskColor(p.risk)}
                opacity={0.15}
              />
            );
          })}

          {/* horizontal grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((g) => (
            <line
              key={g}
              x1={PAD}
              x2={W - PAD}
              y1={PAD + (1 - g) * innerH}
              y2={PAD + (1 - g) * innerH}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          ))}

          {/* ETA line */}
          <path d={path} fill="none" stroke="#0f172a" strokeWidth={2} />

          {/* time ticks */}
          {data.arr.map((p, i) =>
            i % Math.max(1, Math.floor(data.arr.length / 6)) === 0 ? (
              <g key={`tick-${i}`}>
                <line
                  x1={x(i)}
                  x2={x(i)}
                  y1={H - PAD}
                  y2={H - PAD + 4}
                  stroke="#cbd5e1"
                />
                <text
                  x={x(i)}
                  y={H - 2}
                  fontSize="10"
                  textAnchor="middle"
                  fill="#475569"
                >
                  {fmtTime(p.timeISO)}
                </text>
              </g>
            ) : null,
          )}

          {/* NOW marker */}
          {data.nowIdx >= 0 && (
            <g>
              <line
                x1={x(data.nowIdx)}
                x2={x(data.nowIdx)}
                y1={PAD}
                y2={H - PAD}
                stroke="#94a3b8"
                strokeDasharray="4 4"
              />
              <text
                x={x(data.nowIdx)}
                y={PAD - 6}
                fontSize="10"
                textAnchor="middle"
                fill="#64748b"
              >
                Now
              </text>
            </g>
          )}

          {/* BEST marker */}
          <g>
            <circle
              cx={x(data.bestIdx)}
              cy={y(data.arr[data.bestIdx].etaMin)}
              r={4}
              fill="#16a34a"
              stroke="#065f46"
              strokeWidth={1}
            />
            <text
              x={x(data.bestIdx)}
              y={y(data.arr[data.bestIdx].etaMin) - 8}
              fontSize="10"
              textAnchor="middle"
              fill="#065f46"
            >
              Best
            </text>
          </g>

          {/* hover guide */}
          {hi >= 0 && (
            <>
              <line
                x1={x(hi)}
                x2={x(hi)}
                y1={PAD}
                y2={H - PAD}
                stroke="#334155"
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <circle cx={x(hi)} cy={y(hp.etaMin)} r={4} fill="#334155" />
            </>
          )}

          {/* invisible hit areas for hover */}
          {data.arr.map((_, i) => {
            const nextX = i === data.arr.length - 1 ? x(i) : x(i + 1);
            const w = Math.max(6, nextX - x(i));
            return (
              <rect
                key={`hit-${i}`}
                x={x(i) - w / 2}
                y={0}
                width={w}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                onFocus={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            );
          })}
        </svg>

        {/* tooltip below chart */}
        <div className="mt-2 text-sm text-slate-700">
          <span className="font-medium">{fmtTime(hp.timeISO)}</span> · ETA{" "}
          <span className="font-medium">{hp.etaMin} min</span> · Risk{" "}
          <span
            className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
            style={{
              color: riskColor(hp.risk),
              borderColor: riskColor(hp.risk),
            }}
          >
            {riskLabel(hp.risk)}
          </span>
          {savedMin > 0 && (
            <>
              {" "}
              · Saves <span className="font-medium">{savedMin} min</span> vs now
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Heatmap;
