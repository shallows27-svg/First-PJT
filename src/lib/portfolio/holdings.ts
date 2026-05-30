// src/lib/portfolio/holdings.ts
import type { HoldingItem, Region, VisionItem } from "./schema";

// value_krw를 quantity × current_price로 항상 일관되게 채우는 단일 진입점.
// 비전 응답·검수 편집·서버 저장 모든 경로가 이 함수를 통과해야 값이 drift하지 않는다.
export function withComputedValue(item: HoldingItem | VisionItem): HoldingItem {
  return {
    ticker: item.ticker,
    name: item.name,
    quantity: item.quantity,
    current_price: item.current_price,
    region: item.region,
    value_krw: item.quantity * item.current_price,
  };
}

// DB에 저장된 레거시 데이터(스키마 변경 전)는 current_price 필드가 없다.
// value_krw / quantity로 역산해 채워 넣는다. 새 데이터는 그대로 통과.
export function coerceHoldingItem(raw: unknown): HoldingItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const quantity = typeof r.quantity === "number" ? r.quantity : 0;
  const value_krw = typeof r.value_krw === "number" ? r.value_krw : 0;
  const current_price =
    typeof r.current_price === "number"
      ? r.current_price
      : quantity > 0
        ? value_krw / quantity
        : 0;
  const ticker = typeof r.ticker === "string" ? r.ticker : null;
  const name = typeof r.name === "string" ? r.name : "";
  // 레거시 'US' / 'GLOBAL'은 모두 'GL/US'로 흡수. KR·Cash는 그대로.
  const rawRegion = r.region;
  const region: Region =
    rawRegion === "GL/US" || rawRegion === "US" || rawRegion === "GLOBAL"
      ? "GL/US"
      : rawRegion === "KR" || rawRegion === "Cash"
        ? rawRegion
        : "KR";
  if (!name) return null;
  return withComputedValue({
    ticker,
    name,
    quantity,
    current_price,
    region,
    value_krw,
  });
}

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
      // 수량은 합산. current_price는 기존 값 우선 (동일 종목이면 가격이 같다는 가정).
      // value_krw는 마지막에 withComputedValue로 일괄 재계산되므로 여기선 직접 안 건드림.
      prev.quantity += item.quantity;
      mergedCount += 1;
    } else {
      map.set(key, item);
    }
  }

  // 합산이 발생한 항목은 value_krw를 다시 계산. 단일 항목도 일관성 위해 통과.
  const merged = Array.from(map.values()).map(withComputedValue);
  return { merged, mergedCount };
}

// LLM region 추정이 ticker 패턴과 명백히 충돌하면 보정.
// 알파벳 1~5자 ticker(AAPL, TSLA 등)인데 region이 KR로 잘못 분류된 경우만 GL/US로 교정.
export function correctRegion(item: HoldingItem): HoldingItem {
  if (!item.ticker) return item;
  const isUsTicker = /^[A-Z]{1,5}$/.test(item.ticker);
  if (isUsTicker && item.region === "KR") {
    return { ...item, region: "GL/US" };
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
  const by_region: Record<Region, number> = { KR: 0, "GL/US": 0, Cash: 0 };
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
    `지역: KR ${alloc.by_region.KR.toFixed(0)}% / GL·US ${alloc.by_region["GL/US"].toFixed(0)}% / Cash ${alloc.by_region.Cash.toFixed(0)}%`,
  ].join("\n");
}
