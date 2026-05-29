// src/components/dashboard/AllocationCharts.tsx
"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { HoldingItem, Region } from "@/lib/portfolio/schema";
import { computeAllocation } from "@/lib/portfolio/holdings";

const ITEM_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7",
  "#06b6d4", "#84cc16", "#ec4899", "#14b8a6", "#f97316",
];
const REGION_COLORS: Record<Region, string> = {
  KR: "#3b82f6",      // blue
  "GL/US": "#22c55e", // green (해외 노출 통합)
  Cash: "#71717a",    // zinc (중립)
};

const formatKrw = (n: number) =>
  `${new Intl.NumberFormat("ko-KR").format(Math.round(n))}원`;

export function AllocationCharts({ items }: { items: HoldingItem[] }) {
  const alloc = computeAllocation(items);
  const itemData = alloc.by_item.map((r, idx) => ({
    name: r.item.name,
    value: r.item.value_krw,
    pct: r.pct,
    color: ITEM_COLORS[idx % ITEM_COLORS.length],
  }));
  const regionData = (Object.keys(alloc.by_region) as Region[])
    .map((region) => ({
      name: region,
      value: alloc.by_region[region],
      color: REGION_COLORS[region],
    }))
    .filter((r) => r.value > 0);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <ChartCard title="종목별 비중">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={itemData}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={1}
            >
              {itemData.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, _n, p) =>
                [`${formatKrw(Number(v))} (${(p.payload as { pct: number }).pct.toFixed(1)}%)`, (p.payload as { name: string }).name]
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <AccessibilityTable
          headers={["종목", "평가금액", "비중"]}
          rows={itemData.map((d) => [d.name, formatKrw(d.value), `${d.pct.toFixed(1)}%`])}
        />
      </ChartCard>

      <ChartCard title="지역별 비중">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={regionData}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={1}
            >
              {regionData.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, _n, p) =>
                [`${Number(v).toFixed(1)}%`, (p.payload as { name: string }).name]
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <AccessibilityTable
          headers={["지역", "비중"]}
          rows={regionData.map((d) => [d.name, `${d.value.toFixed(1)}%`])}
        />
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-2 text-xs font-semibold text-zinc-700">{title}</h3>
      {children}
    </div>
  );
}

// 차트는 시각 전용이므로 동일 데이터를 sr-only 표로 병행 제공 (접근성).
function AccessibilityTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <table className="sr-only">
      <thead>
        <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => <td key={j}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
