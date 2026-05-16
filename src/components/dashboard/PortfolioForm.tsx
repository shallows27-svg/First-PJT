"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { analyzePortfolio, type PortfolioState } from "@/app/dashboard/actions";

// defaultHoldings: 서버에서 읽어온 마지막 입력 보유 종목. 수정 후 다시 분석 가능.
export function PortfolioForm({
  defaultHoldings,
}: {
  defaultHoldings: string;
}) {
  const [state, formAction, isPending] = useActionState<
    PortfolioState,
    FormData
  >(analyzePortfolio, null);

  return (
    <form action={formAction} className="space-y-3">
      <Textarea
        name="holdings"
        defaultValue={defaultHoldings}
        required
        maxLength={4000}
        rows={5}
        placeholder="예: 삼성전자 10주, 애플 5주, 미국 S&P500 ETF 300만원, 현금 200만원 …"
        aria-label="보유 종목"
      />

      {state?.error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 bg-emerald-600 text-white hover:bg-emerald-500"
      >
        {isPending ? "분석 중…" : "AI로 3줄 요약"}
      </Button>
    </form>
  );
}
