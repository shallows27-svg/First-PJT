"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { summarizePortfolio } from "@/lib/openrouter";
import { summarizePortfolioFromItems } from "@/lib/ai/summary";
import { extractHoldingsFromImages } from "@/lib/ai/vision";
import {
  HoldingItemSchema,
  type HoldingItem,
} from "@/lib/portfolio/schema";
import { correctRegion, mergeHoldings } from "@/lib/portfolio/holdings";
import {
  incrementVisionCall,
  rollbackVisionCall,
} from "@/lib/portfolio/rate-limit";
import { z } from "zod";

export type MessageState = { error: string } | null;

export async function saveMessage(
  _prev: MessageState,
  formData: FormData,
): Promise<MessageState> {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) {
    return { error: "한 줄을 입력해주세요." };
  }
  if (content.length > 200) {
    return { error: "한 줄은 200자 이내로 입력해주세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 서버 액션은 폼 외에 직접 POST로도 호출될 수 있으므로 인증을 반드시 재확인.
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  // 사용자당 한 행만 유지 — user_id 충돌 시 기존 한 줄을 덮어쓴다.
  const { error } = await supabase.from("messages").upsert(
    {
      user_id: user.id,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { error: "저장에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  // 서버 컴포넌트가 최신 한 줄을 다시 읽도록 대시보드를 무효화.
  revalidatePath("/dashboard");
  return null;
}

export type PortfolioState = { error: string } | null;

// AI 호출 디바운스: 사용자당 직전 분석 이후 최소 간격(ms).
// OpenRouter 비용 폭주 방지 목적의 1차 가드. 더 강한 보호가 필요하면
// 별도 카운트 테이블이나 Vercel Runtime Cache로 일일 한도를 추가할 것.
const ANALYZE_MIN_INTERVAL_MS = 10_000;

export async function analyzePortfolio(
  _prev: PortfolioState,
  formData: FormData,
): Promise<PortfolioState> {
  const holdings = String(formData.get("holdings") ?? "").trim();
  if (!holdings) {
    return { error: "보유 종목을 입력해주세요." };
  }
  if (holdings.length > 4000) {
    return { error: "입력이 너무 깁니다. 4000자 이내로 입력해주세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 서버 액션은 폼 외에 직접 POST로도 호출될 수 있으므로 인증을 반드시 재확인.
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  // 직전 호출 시각을 보고 N초 내 재호출을 차단한다. RLS가 자기 행만 보여주므로
  // 다른 사용자에게는 영향이 없다.
  const { data: lastRow } = await supabase
    .from("portfolios")
    .select("updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (lastRow?.updated_at) {
    const elapsed = Date.now() - new Date(lastRow.updated_at).getTime();
    if (elapsed < ANALYZE_MIN_INTERVAL_MS) {
      const waitSec = Math.ceil((ANALYZE_MIN_INTERVAL_MS - elapsed) / 1000);
      return { error: `잠시 후 다시 시도해주세요. (${waitSec}초)` };
    }
  }

  let summary: string;
  try {
    summary = await summarizePortfolio(holdings);
  } catch (e) {
    // 원인은 서버 콘솔에만 — 키/요청 본문은 openrouter.ts에서 이미 제외됨.
    console.error("[analyzePortfolio] AI 요약 실패:", e);
    return { error: "AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  // 사용자당 한 행만 유지 — user_id 충돌 시 기존 포트폴리오/요약을 덮어쓴다.
  const { error } = await supabase.from("portfolios").upsert(
    {
      user_id: user.id,
      holdings,
      ai_summary: summary,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { error: "저장에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  revalidatePath("/dashboard");
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// 신규: 스크린샷 분석. DB write 없음. 결과 items만 client에 반환.
// ────────────────────────────────────────────────────────────────────────────

export type AnalyzeState =
  | { ok: true; items: HoldingItem[] }
  | { ok: false; error: string };

const MAX_FILES = 5;
const MAX_BYTES_PER_FILE = 5 * 1024 * 1024;
const MAX_BYTES_TOTAL = 15 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function analyzeScreenshots(
  _prev: AnalyzeState | null,
  formData: FormData,
): Promise<AnalyzeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return { ok: false, error: "이미지를 업로드해주세요." };
  }
  if (files.length > MAX_FILES) {
    return {
      ok: false,
      error: `한 번에 최대 ${MAX_FILES}장까지 업로드할 수 있습니다.`,
    };
  }

  let totalBytes = 0;
  for (const file of files) {
    if (!ACCEPTED_TYPES.has(file.type)) {
      return {
        ok: false,
        error: "이미지 파일(jpg, png, webp)만 업로드할 수 있습니다.",
      };
    }
    if (file.size > MAX_BYTES_PER_FILE) {
      return { ok: false, error: "파일 1장은 5MB 이하여야 합니다." };
    }
    totalBytes += file.size;
  }
  if (totalBytes > MAX_BYTES_TOTAL) {
    return { ok: false, error: "총 업로드 용량은 15MB 이하여야 합니다." };
  }

  const rl = await incrementVisionCall(user.id);
  if (!rl.allowed) {
    return {
      ok: false,
      error: "분석 한도를 잠시 초과했습니다. 1시간 뒤 다시 시도해주세요.",
    };
  }

  let items: HoldingItem[];
  try {
    const base64s = await Promise.all(
      files.map(async (f) => {
        const buf = Buffer.from(await f.arrayBuffer());
        return buf.toString("base64");
      }),
    );
    const rawItems = await extractHoldingsFromImages(base64s);
    const corrected = rawItems.map(correctRegion);
    // 한 번의 분석 호출 내부에서도 동일 종목이 중복 행으로 나올 수 있으므로 합산.
    const { merged } = mergeHoldings([], corrected);
    items = merged;
  } catch (e) {
    console.error("[analyzeScreenshots] 비전 호출 실패:", e);
    await rollbackVisionCall(user.id);
    return {
      ok: false,
      error: "분석에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  return { ok: true, items };
}

// ────────────────────────────────────────────────────────────────────────────
// 신규: 저장 + 요약. DB write + ai_summary 생성.
// ────────────────────────────────────────────────────────────────────────────

export type SaveState = { ok: true } | { ok: false; error: string };

const SAVE_DEBOUNCE_MS = 30_000;

export async function savePortfolio(items: HoldingItem[]): Promise<SaveState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 방어적 재검증. client state는 신뢰 X.
  let validated: HoldingItem[];
  try {
    const parsed = z.array(HoldingItemSchema).max(100).parse(items);
    const corrected = parsed.map(correctRegion);
    validated = mergeHoldings([], corrected).merged;
  } catch {
    return { ok: false, error: "보유종목 데이터가 올바르지 않습니다." };
  }
  if (validated.length === 0) {
    return { ok: false, error: "저장할 보유종목이 없습니다." };
  }

  // 30초 디바운스: 직전 저장 후 짧은 시간 내 재호출 차단.
  const { data: lastRow } = await supabase
    .from("portfolios")
    .select("updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (lastRow?.updated_at) {
    const elapsed = Date.now() - new Date(lastRow.updated_at).getTime();
    if (elapsed < SAVE_DEBOUNCE_MS) {
      const wait = Math.ceil((SAVE_DEBOUNCE_MS - elapsed) / 1000);
      return { ok: false, error: `잠시 후 다시 시도해주세요. (${wait}초)` };
    }
  }

  // 요약 실패는 fatal 아님 — 빈 문자열로 저장 후 사용자가 [요약 다시 생성] 트리거.
  let aiSummary = "";
  try {
    aiSummary = await summarizePortfolioFromItems(validated);
  } catch (e) {
    console.error("[savePortfolio] 요약 호출 실패:", e);
  }

  const { error } = await supabase.from("portfolios").upsert(
    {
      user_id: user.id,
      holdings_items: validated,
      ai_summary: aiSummary,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return {
      ok: false,
      error: "저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

// 사용자 수동 트리거: 요약만 다시 생성. holdings_items 는 건드리지 않음.
export async function regenerateSummary(): Promise<SaveState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: row } = await supabase
    .from("portfolios")
    .select("holdings_items")
    .eq("user_id", user.id)
    .maybeSingle();

  const items = (row?.holdings_items ?? []) as HoldingItem[];
  if (items.length === 0) {
    return { ok: false, error: "보유종목이 없습니다." };
  }

  let aiSummary: string;
  try {
    aiSummary = await summarizePortfolioFromItems(items);
  } catch (e) {
    console.error("[regenerateSummary] 요약 호출 실패:", e);
    return {
      ok: false,
      error: "요약 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  const { error } = await supabase
    .from("portfolios")
    .update({ ai_summary: aiSummary, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "저장에 실패했습니다." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
