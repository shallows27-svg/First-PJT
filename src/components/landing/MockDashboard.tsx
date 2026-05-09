import { Card } from "@/components/ui/card";

type Holding = {
  symbol: string;
  weight: number;
  change: number | null;
};

const holdings: Holding[] = [
  { symbol: "AAPL", weight: 32.4, change: 1.2 },
  { symbol: "NVDA", weight: 24.1, change: -0.8 },
  { symbol: "TSLA", weight: 17.5, change: 0.3 },
  { symbol: "삼성전자", weight: 14.0, change: 0.5 },
  { symbol: "기타", weight: 12.0, change: null },
];

function formatChange(change: number | null) {
  if (change === null) return "—";
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

function changeColor(change: number | null) {
  if (change === null) return "text-zinc-400";
  if (change > 0) return "text-emerald-600";
  if (change < 0) return "text-rose-600";
  return "text-zinc-500";
}

export function MockDashboard() {
  return (
    <Card className="w-full max-w-md p-6 shadow-xl">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500">전체 포트폴리오</p>
          <p className="text-sm font-semibold text-zinc-900">3개 계좌 통합</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          LIVE
        </span>
      </div>

      <div className="mb-5 h-20 overflow-hidden rounded-md bg-gradient-to-r from-emerald-100 via-blue-100 to-violet-100">
        <div className="flex h-full items-end gap-1 p-2">
          {[40, 65, 55, 78, 62, 85, 92].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-zinc-900/70"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {holdings.map((h) => (
          <div
            key={h.symbol}
            className="flex items-center justify-between text-sm"
          >
            <span className="font-medium text-zinc-800">{h.symbol}</span>
            <div className="flex items-center gap-3">
              <span className="tabular-nums text-zinc-700">
                {h.weight.toFixed(1)}%
              </span>
              <span
                className={`w-12 text-right text-xs tabular-nums ${changeColor(h.change)}`}
              >
                {formatChange(h.change)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
