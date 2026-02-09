"use client";

type UiTheme = "dark" | "light";

type Props = {
  points: number[];
  theme: UiTheme;
  direction?: string; // "UP" | "DOWN" | undefined
};

export default function Sparkline({ points, theme, direction }: Props) {
  const isDark = theme === "dark";

  // Boş veri durumu
  if (!points || points.length === 0) {
    return (
      <div
        className={
          "h-16 w-full rounded-xl border text-[10px] flex items-center justify-center " +
          (isDark
            ? "border-slate-800 bg-slate-950 text-slate-600"
            : "border-slate-200 bg-slate-50 text-slate-400")
        }
      >
        –
      </div>
    );
  }

  const width = 200;
  const height = 64;
  const padding = 4;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  const stepX =
    points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const normalized = points.map((p, i) => {
    const x = padding + i * stepX;
    const y =
      padding + ((max - p) / span) * (height - padding * 2); // yukarı düşük, aşağı yüksek
    return { x, y };
  });

  const pathD = normalized
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Renkler: yukarı yeşil, aşağı kırmızı, sabit gri
  const strokeColor =
    direction === "UP"
      ? "#2F6F62" // trustGreen
      : direction === "DOWN"
      ? "#f97373" // red-400
      : isDark
      ? "#64748b" // slate-500
      : "#94a3b8"; // slate-400

  const bgClass = isDark ? "bg-slate-950" : "bg-slate-100";
  const borderClass = isDark ? "border-slate-800" : "border-slate-300";

  return (
    <div className={`h-16 w-full overflow-hidden rounded-xl border ${bgClass} ${borderClass}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        {/* Hafif grid / zemin çizgisi */}
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={isDark ? "#1e293b" : "#e2e8f0"}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        {/* Ana çizgi */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
