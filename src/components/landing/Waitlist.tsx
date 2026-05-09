"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Waitlist() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    console.log("[Waitlist] mock submit:", email);
    setSubmitted(true);
  }

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
          준비가 되면 이메일 한 통으로 알려드립니다. 이메일은 알림 외 용도로
          사용하지 않습니다.
        </p>

        {submitted ? (
          <div className="mx-auto max-w-md rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-6 py-5 text-emerald-200">
            <p className="font-semibold">감사합니다 🎉</p>
            <p className="mt-1 text-sm text-emerald-100/80">
              출시 시 <span className="font-medium">{email}</span> 으로
              알려드릴게요.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 flex-1 bg-white text-zinc-900"
            />
            <Button
              type="submit"
              size="lg"
              className="h-12 bg-emerald-600 px-6 text-base text-white hover:bg-emerald-500"
            >
              사전 신청하기
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
