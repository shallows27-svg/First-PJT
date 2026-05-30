"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitLead, type LeadState } from "@/app/actions";

export function Waitlist() {
  const [state, formAction, isPending] = useActionState<LeadState, FormData>(
    submitLead,
    null,
  );
  const submitted = state?.ok === true;
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (submitted) {
      successRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [submitted]);

  return (
    <section id="waitlist" className="bg-zinc-900 py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-400">
          사전 신청
        </p>
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
          출시 알림을 가장 먼저 받아보세요
        </h2>
        <p className="mb-8 text-base leading-relaxed text-zinc-300">
          이름과 이메일을 남겨주시면 출시 준비가 되는 대로 연락드릴게요.
          이메일은 알림 외 용도로 사용하지 않습니다.
        </p>

        {submitted ? (
          <div
            ref={successRef}
            className="mx-auto max-w-md scroll-mt-24 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-6 py-5 text-emerald-200"
          >
            <p className="font-semibold">곧 연락드릴게요</p>
            <p className="mt-1 text-sm text-emerald-100/80">
              남겨주신 이메일로 출시 소식 전해드리겠습니다.
            </p>
          </div>
        ) : (
          <form
            action={formAction}
            className="mx-auto flex max-w-md flex-col gap-3"
          >
            <Input
              name="name"
              type="text"
              required
              placeholder="이름"
              maxLength={100}
              disabled={isPending}
              className="h-12 bg-white text-zinc-900"
            />
            <Input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              maxLength={254}
              disabled={isPending}
              className="h-12 bg-white text-zinc-900"
            />
            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              className="h-12 bg-emerald-600 px-6 text-base text-white hover:bg-emerald-500"
            >
              {isPending ? "처리 중…" : "사전 신청하기"}
            </Button>
            {state?.ok === false && (
              <p className="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {state.error}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
