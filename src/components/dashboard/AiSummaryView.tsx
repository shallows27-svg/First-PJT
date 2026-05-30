// src/components/dashboard/AiSummaryView.tsx
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { regenerateSummary } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export function AiSummaryView({ summary }: { summary: string }) {
  const [isPending, startTransition] = useTransition();
  const lines = summary
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const onRegenerate = () => {
    startTransition(async () => {
      const res = await regenerateSummary();
      if (res.ok) toast.success("Claude 분석을 다시 생성했습니다.");
      else toast.error(res.error);
    });
  };

  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
        <p className="text-zinc-500">Claude 분석을 생성하지 못했어요.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 h-8"
          onClick={onRegenerate}
          disabled={isPending}
        >
          {isPending ? "생성 중…" : "다시 생성"}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-700">Claude 요약 + 조언</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onRegenerate}
          disabled={isPending}
        >
          {isPending ? "생성 중…" : "다시 생성"}
        </Button>
      </div>
      <ul className="mt-2 space-y-1 text-sm leading-relaxed text-zinc-700">
        {lines.map((line, i) => (
          <li key={i}>• {line}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-zinc-400">
        분석을 위해 OpenRouter(Anthropic Claude)에 사전 집계된 통계만 전송됩니다.
        일반적 관찰이며 투자 자문이 아닙니다.
      </p>
    </div>
  );
}
