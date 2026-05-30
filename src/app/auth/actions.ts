"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | null;

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

// 이메일 확인 redirect URL은 요청자가 보낸 Origin 헤더에 의존하면 안 된다(위변조 가능).
// 운영에서는 NEXT_PUBLIC_SITE_URL, 미배포 환경에선 Vercel 자동 주입 변수, 로컬은 origin/3000 폴백.
function resolveSiteUrl(reqHeaders: Headers): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;
  const vercelPreview = process.env.VERCEL_URL;
  if (vercelPreview) return `https://${vercelPreview}`;
  return reqHeaders.get("origin") ?? "http://localhost:3000";
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "이메일과 비밀번호를 모두 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "로그인 실패: 이메일 또는 비밀번호를 확인해주세요." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "이메일과 비밀번호를 모두 입력해주세요." };
  }
  if (password.length < 6) {
    return { error: "비밀번호는 6자 이상이어야 합니다." };
  }

  const siteUrl = resolveSiteUrl(await headers());
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  });

  if (error) {
    // 계정 열거 방지를 위해 일반 메시지로 통일. 상세 원인은 서버 콘솔에만.
    console.error("[signUp] Supabase 회원가입 실패:", error.message);
    return { error: "회원가입에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  // 이메일 확인이 켜져 있으면 세션이 바로 생기지 않음 → 안내 페이지로.
  if (data.user && !data.session) {
    redirect("/signup/check-email");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
