"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthState } from "@/app/auth/actions";

type Mode = "login" | "signup";

type Props = {
  mode: Mode;
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
};

const copy = {
  login: {
    title: "로그인",
    subtitle: "Portfolio X-ray 계정으로 계속하기",
    submit: "로그인",
    switchText: "아직 계정이 없으신가요?",
    switchHref: "/signup",
    switchCta: "회원가입",
  },
  signup: {
    title: "회원가입",
    subtitle: "이메일로 Portfolio X-ray 시작하기",
    submit: "회원가입",
    switchText: "이미 계정이 있으신가요?",
    switchHref: "/login",
    switchCta: "로그인",
  },
} as const;

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    action,
    null,
  );
  const t = copy[mode];

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="text-sm font-semibold text-emerald-700 hover:underline"
        >
          Portfolio X-ray
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{t.subtitle}</p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium text-zinc-700"
          >
            이메일
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-700"
          >
            비밀번호
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            placeholder={mode === "signup" ? "6자 이상" : "••••••••"}
            className="h-11"
          />
        </div>

        {state?.error && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {state.error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full bg-emerald-600 text-base text-white hover:bg-emerald-500"
        >
          {isPending ? "처리 중…" : t.submit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        {t.switchText}{" "}
        <Link
          href={t.switchHref}
          className="font-medium text-emerald-700 hover:underline"
        >
          {t.switchCta}
        </Link>
      </p>
    </div>
  );
}
