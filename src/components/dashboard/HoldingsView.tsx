// src/components/dashboard/HoldingsView.tsx
import type { HoldingItem } from "@/lib/portfolio/schema";
import { computeAllocation } from "@/lib/portfolio/holdings";

const formatKrw = (n: number) =>
  new Intl.NumberFormat("ko-KR").format(Math.round(n));

export function HoldingsView({ items }: { items: HoldingItem[] }) {
  const alloc = computeAllocation(items);
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
          <tr>
            <th className="px-3 py-2">종목</th>
            <th className="px-3 py-2 text-right">수량</th>
            <th className="px-3 py-2 text-right">평가금액</th>
            <th className="px-3 py-2 text-right">비중</th>
            <th className="px-3 py-2">지역</th>
          </tr>
        </thead>
        <tbody>
          {alloc.by_item
            .sort((a, b) => b.pct - a.pct)
            .map((r) => (
              <tr key={`${r.item.ticker ?? ""}|${r.item.name}`} className="border-t border-zinc-100">
                <td className="px-3 py-2 text-zinc-900">
                  {r.item.name}
                  {r.item.ticker && (
                    <span className="ml-1 text-xs text-zinc-400">
                      {r.item.ticker}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                  {r.item.quantity}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                  {formatKrw(r.item.value_krw)}원
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-900">
                  {r.pct.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {r.item.region}
                </td>
              </tr>
            ))}
        </tbody>
        <tfoot className="bg-zinc-50 text-xs font-semibold text-zinc-700">
          <tr>
            <td className="px-3 py-2" colSpan={2}>
              합계 ({items.length}개 종목)
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              {formatKrw(alloc.total_krw)}원
            </td>
            <td className="px-3 py-2 text-right">100.0%</td>
            <td className="px-3 py-2" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
