// src/components/dashboard/PortfolioSection.tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { HoldingItem } from "@/lib/portfolio/schema";
import { analyzeScreenshots } from "@/app/dashboard/actions";
import { ScreenshotUploader } from "./ScreenshotUploader";
import { HoldingsReviewTable } from "./HoldingsReviewTable";
import { HoldingsView } from "./HoldingsView";
import { AllocationCharts } from "./AllocationCharts";
import { AiSummaryView } from "./AiSummaryView";

type Mode = "empty" | "reviewing" | "saved";

type Props = {
  savedItems: HoldingItem[];
  savedSummary: string;
};

export function PortfolioSection({ savedItems, savedSummary }: Props) {
  const [mode, setMode] = useState<Mode>(
    savedItems.length > 0 ? "saved" : "empty",
  );
  const [reviewItems, setReviewItems] = useState<HoldingItem[]>([]);
  const [pendingMerge, setPendingMerge] = useState<HoldingItem[] | null>(null);
  const [isAnalyzing, startAnalyzing] = useTransition();

  const analyze = (files: File[]) => {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    startAnalyzing(async () => {
      const res = await analyzeScreenshots(null, fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.items.length === 0) {
        toast.message(
          "이미지에서 종목을 인식하지 못했어요. 잔고 표가 명확히 보이는지 확인해주세요.",
        );
        return;
      }
      if (mode === "reviewing") {
        // 검수 중에 들어온 분석 → 표에 머지.
        setPendingMerge(res.items);
      } else {
        // empty 또는 saved → reviewing 진입.
        setReviewItems(
          mode === "saved" ? mergeWithSaved(savedItems, res.items) : res.items,
        );
        setMode("reviewing");
      }
    });
  };

  if (mode === "empty") {
    return (
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">포트폴리오</h2>
        <p className="text-sm text-zinc-500">
          스크린샷을 업로드하면 보유종목과 비중을 자동으로 정리합니다.
        </p>
        <ScreenshotUploader onAnalyze={analyze} isAnalyzing={isAnalyzing} />
      </section>
    );
  }

  if (mode === "reviewing") {
    return (
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">
            포트폴리오 검수
          </h2>
        </header>
        <HoldingsReviewTable
          initial={reviewItems}
          pendingMerge={pendingMerge}
          onMergeConsumed={() => setPendingMerge(null)}
          onSaved={() => {
            setMode("saved");
            setReviewItems([]);
          }}
          onCancel={() => {
            setReviewItems([]);
            setMode(savedItems.length > 0 ? "saved" : "empty");
          }}
          extraActions={
            <div className="w-full sm:w-auto">
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600">
                  추가 업로드
                </summary>
                <div className="mt-2 w-full sm:w-80">
                  <ScreenshotUploader
                    onAnalyze={analyze}
                    isAnalyzing={isAnalyzing}
                    label="추가 분석"
                  />
                </div>
              </details>
            </div>
          }
        />
      </section>
    );
  }

  // saved
  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">포트폴리오</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => {
            setReviewItems(savedItems);
            setMode("reviewing");
          }}
        >
          수정
        </Button>
      </header>
      <AllocationCharts items={savedItems} />
      <HoldingsView items={savedItems} />
      <AiSummaryView summary={savedSummary} />
    </section>
  );
}

function mergeWithSaved(
  saved: HoldingItem[],
  incoming: HoldingItem[],
): HoldingItem[] {
  // [수정] 진입 직후 새 분석이 들어온 케이스. saved 위에 incoming 합산.
  // 정식 머지 로직은 HoldingsReviewTable에서도 한 번 더 적용되므로 여기는 단순 concat.
  return [...saved, ...incoming];
}
