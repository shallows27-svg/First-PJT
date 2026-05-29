// src/lib/quotes/yahoo.ts
// 서버 전용. Yahoo Finance 비공식 chart endpoint로 시세 조회.
// KR + US 동시 지원. KR 6자리 종목코드는 .KS(코스피) → .KQ(코스닥) 순으로 시도.
// USD 등 외화는 KRW=X 환율로 원화 변환.

import { getCache } from "@vercel/functions";

const ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart";
const TIMEOUT_MS = 8_000;
const CACHE_TTL_SECONDS = 300; // 5분

export type QuoteResult =
  | {
      ok: true;
      ticker: string;
      price_krw: number;
      currency: string;
      fetched_at: string;
    }
  | { ok: false; ticker: string; reason: string };

type YahooChartMeta = {
  currency?: string;
  regularMarketPrice?: number;
  exchangeName?: string;
};

async function fetchOnce(symbol: string): Promise<YahooChartMeta | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${ENDPOINT}/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // 일반 브라우저처럼 보이게 — Yahoo는 봇으로 보이면 차단함.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json,text/javascript,*/*;q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) {
      console.warn(`[yahoo] ${symbol}: HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      chart?: {
        result?: Array<{ meta?: YahooChartMeta }>;
        error?: { code?: string; description?: string } | null;
      };
    };
    if (data?.chart?.error) {
      console.warn(`[yahoo] ${symbol}: chart error`, data.chart.error);
      return null;
    }
    const meta = data?.chart?.result?.[0]?.meta ?? null;
    if (!meta) {
      console.warn(`[yahoo] ${symbol}: no meta in response`);
    }
    return meta;
  } catch (e) {
    console.warn(`[yahoo] ${symbol}: fetch threw`, e);
    return null;
  } finally {
    clearTimeout(t);
  }
}

// 한국 6자 종목코드면 .KS → .KQ 순으로 시도. 그 외는 입력 그대로.
// KRX는 2025년부터 신형 알파뉴메릭 코드(예: 0043Y0, 0163Y0)도 발급하므로
// 순수 숫자뿐 아니라 6자 영숫자 패턴 모두 KR로 취급. 미국 ticker는 거의 5자 이하라 충돌 거의 없음.
// 미국 일부 종목이 6자 알파벳일 수 있어 마지막 자가 숫자인 KR 신형 패턴까지 우선 시도.
function expandSymbols(ticker: string): string[] {
  const t = ticker.trim().toUpperCase();
  if (/^[0-9A-Z]{6}$/.test(t)) return [`${t}.KS`, `${t}.KQ`];
  return [t];
}

async function getUsdKrw(): Promise<number | null> {
  const cache = getCache();
  const cacheKey = "yh-fx:USDKRW";
  const cached = (await cache.get(cacheKey)) as number | null;
  if (typeof cached === "number" && cached > 0) return cached;
  const meta = await fetchOnce("KRW=X");
  const v = meta?.regularMarketPrice;
  if (typeof v !== "number" || v <= 0) return null;
  await cache.set(cacheKey, v, { ttl: CACHE_TTL_SECONDS });
  return v;
}

export async function fetchQuote(ticker: string): Promise<QuoteResult> {
  const cache = getCache();
  const cacheKey = `yh-quote:${ticker.trim().toUpperCase()}`;
  const cached = (await cache.get(cacheKey)) as QuoteResult | null;
  if (cached && cached.ok) return cached;

  for (const symbol of expandSymbols(ticker)) {
    const meta = await fetchOnce(symbol);
    if (!meta?.regularMarketPrice) continue;
    let price_krw = meta.regularMarketPrice;
    const currency = meta.currency ?? "";
    if (currency && currency !== "KRW") {
      // USD가 거의 전부. 다른 currency도 동일 환율로 임시 환산 (한계 인지).
      const rate = await getUsdKrw();
      if (!rate) {
        return { ok: false, ticker, reason: "환율 조회 실패" };
      }
      price_krw = meta.regularMarketPrice * rate;
    }
    const result: QuoteResult = {
      ok: true,
      ticker,
      price_krw: Math.round(price_krw),
      currency,
      fetched_at: new Date().toISOString(),
    };
    await cache.set(cacheKey, result, { ttl: CACHE_TTL_SECONDS });
    return result;
  }
  return { ok: false, ticker, reason: "시세를 찾지 못했습니다" };
}

// 동시성 5로 제한해 Yahoo에 부담 안 주고 빠르게 처리.
export async function fetchQuotesBulk(
  tickers: string[],
): Promise<QuoteResult[]> {
  const unique = Array.from(new Set(tickers.map((t) => t.trim()).filter(Boolean)));
  if (unique.length === 0) return [];
  const results: QuoteResult[] = [];
  const queue = [...unique];
  const workers = Array.from({ length: 5 }, async () => {
    while (queue.length > 0) {
      const t = queue.shift();
      if (!t) break;
      const r = await fetchQuote(t);
      results.push(r);
    }
  });
  await Promise.all(workers);
  return results;
}
