// src/components/dashboard/HoldingsReviewTable.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mergeHoldings, computeAllocation } from "@/lib/portfolio/holdings";
import {
  HoldingItemSchema,
  REGION_VALUES,
  type HoldingItem,
  type Region,
} from "@/lib/portfolio/schema";
import { savePortfolio } from "@/app/dashboard/actions";

const formatKrw = (n: number) =>
  new Intl.NumberFormat("ko-KR").format(Math.round(n));

type Props = {
  initial: HoldingItem[];
  onSaved: () => void;
  onCancel: () => void;
  // 표 외부(uploader)에서 새 분석 결과가 들어오면 머지하기 위한 의존성.
  pendingMerge?: HoldingItem[] | null;
  onMergeConsumed?: () => void;
  extraActions?: React.ReactNode; // 표 위 상단 액션 영역에 추가 버튼 슬롯 (예: 추가 업로드)
};

export function HoldingsReviewTable({
  initial,
  onSaved,
  onCancel,
  pendingMerge,
  onMergeConsumed,
  extraActions,
}: Props) {
  const [items, setItems] = useState<HoldingItem[]>(initial);
  const itemsRef = useRef(items);
  const consumedRef = useRef<HoldingItem[] | null | undefined>(null);
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set());
  const [isSaving, startSaving] = useTransition();

  // itemsRef를 최신 상태로 유지.
  useEffect(() => {
    itemsRef.current = items;
  });

  // 외부에서 들어온 새 분석 결과를 머지.
  useEffect(() => {
    if (!pendingMerge || pendingMerge.length === 0) return;
    if (consumedRef.current === pendingMerge) return; // 이미 처리한 인스턴스 (Strict Mode 이중 실행 방지)
    consumedRef.current = pendingMerge;

    const { merged, mergedCount } = mergeHoldings(itemsRef.current, pendingMerge);
    if (mergedCount > 0) {
      toast.success(`${mergedCount}개 종목이 기존 항목과 합산되었습니다`);
    }
    // 플래시 표시할 키 = 새 incoming의 키들 중 prev에 이미 존재했던 것
    const prevKeys = new Set(itemsRef.current.map(rowKey));
    const newlyFlashed = new Set(
      pendingMerge.map(rowKey).filter((k) => prevKeys.has(k)),
    );
    setItems(merged);
    setFlashKeys(newlyFlashed);
    const t = setTimeout(() => setFlashKeys(new Set()), 1500);
    onMergeConsumed?.();

    return () => clearTimeout(t);
  }, [pendingMerge, onMergeConsumed]);

  // 페이지 이탈 경고 (편집 중 + 저장 안 한 변경 보호).
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const alloc = useMemo(() => computeAllocation(items), [items]);

  const updateRow = (idx: number, patch: Partial<HoldingItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeRow = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));
  const addBlankRow = () =>
    setItems((prev) => [
      ...prev,
      { ticker: null, name: "", quantity: 0, value_krw: 0, region: "KR" },
    ]);

  const onSave = () => {
    // client 측 1차 검증.
    for (const [i, it] of items.entries()) {
      const r = HoldingItemSchema.safeParse(it);
      if (!r.success) {
        toast.error(`${i + 1}번 행을 확인해주세요. (${r.error.issues[0]?.message})`);
        return;
      }
    }
    startSaving(async () => {
      const res = await savePortfolio(items);
      if (res.ok) {
        toast.success("저장되었습니다.");
        onSaved();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
        <div>
          총평가 <strong>{formatKrw(alloc.total_krw)}원</strong>
          {" · "}종목 <strong>{items.length}</strong>
          {" · "}KR {alloc.by_region.KR.toFixed(0)}% · US{" "}
          {alloc.by_region.US.toFixed(0)}% · GLOBAL{" "}
          {alloc.by_region.GLOBAL.toFixed(0)}%
        </div>
        {extraActions}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-2 py-2">종목명</th>
              <th className="px-2 py-2 text-right">수량</th>
              <th className="px-2 py-2 text-right">평가금액(원)</th>
              <th className="px-2 py-2">지역</th>
              <th className="px-2 py-2 text-right">비중</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const k = rowKey(it);
              const flash = flashKeys.has(k);
              const pct = alloc.by_item[idx]?.pct ?? 0;
              return (
                <tr
                  key={`${k}-${idx}`}
                  className={`border-t border-zinc-100 transition-colors ${flash ? "bg-yellow-100" : ""}`}
                >
                  <td className="px-2 py-1">
                    <Input
                      value={it.name}
                      onChange={(e) => updateRow(idx, { name: e.target.value })}
                      className="h-8"
                    />
                    {it.ticker && (
                      <span className="ml-1 text-[10px] text-zinc-400">
                        {it.ticker}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={it.quantity}
                      onChange={(e) =>
                        updateRow(idx, { quantity: Number(e.target.value) || 0 })
                      }
                      className="h-8 text-right tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={it.value_krw}
                      onChange={(e) =>
                        updateRow(idx, { value_krw: Number(e.target.value) || 0 })
                      }
                      className="h-8 text-right tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={it.region}
                      onChange={(e) =>
                        updateRow(idx, { region: e.target.value as Region })
                      }
                      className="h-8 rounded border border-zinc-200 bg-white px-2 text-xs"
                    >
                      {REGION_VALUES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-zinc-700">
                    {pct.toFixed(1)}%
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="text-zinc-400 hover:text-red-600"
                      aria-label="삭제"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addBlankRow}>
          + 행 직접 추가
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            취소
          </Button>
          <Button type="button" onClick={onSave} disabled={isSaving || items.length === 0}>
            {isSaving ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function rowKey(it: HoldingItem): string {
  return it.ticker
    ? `t:${it.ticker.toUpperCase()}`
    : `n:${it.name.trim().toLowerCase()}`;
}
