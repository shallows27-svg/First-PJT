// src/lib/portfolio/rate-limit.ts
// 서버 전용. Vercel Runtime Cache 기반 시간당 카운터.
// 원자성 보장 X — MVP 한도(분당 0.33회 평균)에서는 동시성 경합 무시 가능.
import { getCache } from "@vercel/functions";

const HOURLY_LIMIT = 20;
const TTL_SECONDS = 3600;

function key(userId: string): string {
  return `vision-rl:${userId}`;
}

export type RateLimitResult = { allowed: boolean; current: number; limit: number };

export async function incrementVisionCall(userId: string): Promise<RateLimitResult> {
  const cache = getCache();
  const k = key(userId);
  const prev = ((await cache.get(k)) as number | null) ?? 0;
  const next = prev + 1;
  if (next > HOURLY_LIMIT) {
    return { allowed: false, current: prev, limit: HOURLY_LIMIT };
  }
  await cache.set(k, next, { ttl: TTL_SECONDS });
  return { allowed: true, current: next, limit: HOURLY_LIMIT };
}

// 비전 호출이 실패한 경우 카운터를 한 칸 되돌린다. 사용자가 재시도 가능하도록.
export async function rollbackVisionCall(userId: string): Promise<void> {
  const cache = getCache();
  const k = key(userId);
  const cur = ((await cache.get(k)) as number | null) ?? 0;
  if (cur > 0) {
    await cache.set(k, cur - 1, { ttl: TTL_SECONDS });
  }
}
