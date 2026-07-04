"use client";

import { useState } from "react";
import { CategoryBreakdown } from "@/services/transactions";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#eab308",
  "#ec4899",
  "#64748b",
  "#14b8a6",
];

interface IconDonutChartProps {
  data: CategoryBreakdown[];
  iconMap: Record<string, string>;
  currency: string;
  totalLabel: string;
  emptyLabel: string;
}

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 110;
const STROKE_WIDTH = 36;
const ICON_RADIUS = RADIUS + STROKE_WIDTH / 2 + 22;
const ICON_SIZE = 44;

function polarToCartesian(angleDeg: number, radius: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: parseFloat((CENTER + radius * Math.cos(angleRad)).toFixed(4)),
    y: parseFloat((CENTER + radius * Math.sin(angleRad)).toFixed(4)),
  };
}

function describeArc(startAngle: number, endAngle: number) {
  const start = polarToCartesian(endAngle, RADIUS);
  const end = polarToCartesian(startAngle, RADIUS);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    start.x,
    start.y,
    "A",
    RADIUS,
    RADIUS,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

export default function IconDonutChart({
  data,
  iconMap,
  currency,
  totalLabel,
  emptyLabel,
}: IconDonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  if (data.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>;
  }

  const total = data.reduce((sum, d) => sum + d.amount, 0);

  const segments: Array<CategoryBreakdown & {
    index: number;
    startAngle: number;
    endAngle: number;
    midAngle: number;
    iconPos: { x: number; y: number };
    labelPos: { x: number; y: number };
    color: string;
  }> = [];

  let currentAngle = 0;
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const angleSpan = (d.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSpan;
    const midAngle = (startAngle + endAngle) / 2;
    currentAngle = endAngle;

    const iconPos = polarToCartesian(midAngle, ICON_RADIUS);
    const labelPos = polarToCartesian(midAngle, RADIUS);

    segments.push({
      ...d,
      index: i,
      startAngle,
      endAngle,
      midAngle,
      iconPos,
      labelPos,
      color: COLORS[i % COLORS.length],
    });
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const hoveredSegment = hoveredIndex !== null ? segments[hoveredIndex] : null;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{ width: SIZE, height: SIZE }}
        onMouseMove={handleMouseMove}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {segments.map((seg) => (
            <path
              key={seg.category}
              d={describeArc(seg.startAngle, seg.endAngle)}
              fill="none"
              stroke={seg.color}
              strokeWidth={hoveredIndex === seg.index ? STROKE_WIDTH + 6 : STROKE_WIDTH}
              strokeLinecap="butt"
              style={{ transition: "stroke-width 0.15s ease", cursor: "pointer" }}
              onMouseEnter={() => setHoveredIndex(seg.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}

          {segments.map((seg) => (
            <text
              key={`label-${seg.category}`}
              x={seg.labelPos.x}
              y={seg.labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="13"
              fontWeight="700"
              fill="white"
              pointerEvents="none"
            >
              {seg.percentage.toFixed(0)}%
            </text>
          ))}
        </svg>

        {segments.map((seg) => (
          <div
            key={`icon-${seg.category}`}
            className="absolute flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-md border-2 cursor-pointer"
            style={{
              width: ICON_SIZE,
              height: ICON_SIZE,
              left: seg.iconPos.x - ICON_SIZE / 2,
              top: seg.iconPos.y - ICON_SIZE / 2,
              borderColor: seg.color,
              fontSize: 20,
            }}
            onMouseEnter={() => setHoveredIndex(seg.index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {iconMap[seg.category] ?? "💰"}
          </div>
        ))}

        <div
          className="absolute flex flex-col items-center justify-center text-center"
          style={{
            left: CENTER - RADIUS + STROKE_WIDTH,
            top: CENTER - RADIUS + STROKE_WIDTH,
            width: (RADIUS - STROKE_WIDTH) * 2,
            height: (RADIUS - STROKE_WIDTH) * 2,
          }}
        >
          <span className="text-xs text-slate-500 dark:text-slate-400">{totalLabel}</span>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(total, currency)}
          </span>
        </div>

        {hoveredSegment && (
          <div
            className="absolute z-30 pointer-events-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg px-3 py-2 text-sm whitespace-nowrap"
            style={{
              left: mousePos.x + 12,
              top: mousePos.y + 12,
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: hoveredSegment.color }}
              />
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {iconMap[hoveredSegment.category] ?? "💰"} {hoveredSegment.category}
              </span>
            </div>
            <div className="mt-1 text-slate-600 dark:text-slate-400">
              {formatCurrency(hoveredSegment.amount, currency)} ({hoveredSegment.percentage.toFixed(1)}%)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}