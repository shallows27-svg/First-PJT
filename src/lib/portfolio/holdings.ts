// src/lib/portfolio/holdings.ts
import type { HoldingItem, Region } from "./schema";

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function mergeKey(item: HoldingItem): string {
  if (item.ticker) return `t:${item.ticker.toUpperCase()}`;
  return `n:${normalizeName(item.name).toLowerCase()}`;
}

// 같은 키 항목 합산. 기존 행의 region/name/ticker는 보존 — 사용자가 검수 단계에서
// 이미 토글했을 수 있으므로 들어오는 값이 덮어쓰지 않게 한다.
export function mergeHoldings(
  existing: HoldingItem[],
  incoming: HoldingItem[],
): { merged: HoldingItem[]; mergedCount: number } {
  const map = new Map<string, HoldingItem>();
  let mergedCount = 0;

  for (const item of existing) {
    map.set(mergeKey(item), { ...item, name: normalizeName(item.name) });
  }

  for (const raw of incoming) {
    const item = { ...raw, name: normalizeName(raw.name) };
    const key = mergeKey(item);
    const prev = map.get(key);
    if (prev) {
      prev.quantity += item.quantity;
      prev.value_krw += item.value_krw;
      mergedCount += 1;
    } else {
      map.set(key, item);
    }
  }

  return { merged: Array.from(map.values()), mergedCount };
}

// LLM region 추정이 ticker 패턴과 명백히 충돌하면 보정.
// 알파벳 1~5자 ticker(AAPL, TSLA 등)인데 region이 KR로 잘못 분류된 경우만 US로 교정.
export function correctRegion(item: HoldingItem): HoldingItem {
  if (!item.ticker) return item;
  const isUsTicker = /^[A-Z]{1,5}$/.test(item.ticker);
  if (isUsTicker && item.region === "KR") {
    return { ...item, region: "US" };
  }
  return item;
}

export type Allocation = {
  total_krw: number;
  by_item: Array<{ item: HoldingItem; pct: number }>;
  by_region: Record<Region, number>;
};

export function computeAllocation(items: HoldingItem[]): Allocation {
  const total = items.reduce((sum, h) => sum + h.value_krw, 0);
  const safe = total > 0 ? total : 1;
  const by_item = items.map((item) => ({
    item,
    pct: (item.value_krw / safe) * 100,
  }));
  const by_region: Record<Region, number> = { KR: 0, US: 0, GLOBAL: 0 };
  for (const item of items) {
    by_region[item.region] += (item.value_krw / safe) * 100;
  }
  return { total_krw: total, by_item, by_region };
}

// 요약 호출에 넘길 사전 집계 텍스트. raw JSON 대신 사람이 읽는 요약을 전달해 토큰 절감 + 일관성 확보.
export function formatPortfolioForSummary(items: HoldingItem[]): string {
  const alloc = computeAllocation(items);
  const formatKrw = (n: number) =>
    new Intl.NumberFormat("ko-KR").format(Math.round(n));
  const top3 = [...alloc.by_item]
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)
    .map((r) => `${r.item.name} ${r.pct.toFixed(0)}%`)
    .join(", ");
  return [
    `총평가: ${formatKrw(alloc.total_krw)}원`,
    `종목수: ${items.length}`,
    `상위3: ${top3 || "없음"}`,
    `지역: KR ${alloc.by_region.KR.toFixed(0)}% / US ${alloc.by_region.US.toFixed(0)}% / GLOBAL ${alloc.by_region.GLOBAL.toFixed(0)}%`,
  ].join("\n");
}
