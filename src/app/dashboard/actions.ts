"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { summarizePortfolio } from "@/lib/openrouter";

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
