// src/components/dashboard/HoldingsReviewTable.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mergeHoldings, computeAllocation, withComputedValue } from "@/lib/portfolio/holdings";
import {
  HoldingItemSchema,
  REGION_VALUES,
  type HoldingItem,
  type Region,
} from "@/lib/portfolio/schema";
import { savePortfolio, refreshQuotes } from "@/app/dashboard/actions";

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
  // 수동 합치기용 선택 인덱스. 구조 변경(행 추가/삭제/머지) 시 비워서 idx drift 방지.
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());
  const [isSaving, startSaving] = useTransition();
  const [isFetchingQuotes, startFetchingQuotes] = useTransition();

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
    setItems((prev) =>
      prev.map((it, i) =>
        // 모든 행 변경은 withComputedValue로 통과해 value_krw가 항상 quantity × current_price.
        i === idx ? withComputedValue({ ...it, ...patch }) : it,
      ),
    );
  const removeRow = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdxs(new Set()); // idx drift 방지
  };
  const addBlankRow = () => {
    setItems((prev) => [
      ...prev,
      {
        ticker: null,
        name: "",
        quantity: 0,
        current_price: 0,
        value_krw: 0,
        region: "KR",
      },
    ]);
    setSelectedIdxs(new Set());
  };

  const toggleSelected = (idx: number) =>
    setSelectedIdxs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  // ticker가 있는 행들에 대해 Yahoo Finance에서 시세 끌어와 current_price 갱신.
  // 선택된 행이 있으면 그것만, 없으면 전체 행 대상.
  const refreshAllQuotes = () => {
    const targetIdxs = selectedIdxs.size > 0 ? [...selectedIdxs] : items.map((_, i) => i);
    const tickers = targetIdxs
      .map((i) => items[i]?.ticker)
      .filter((t): t is string => !!t && t.trim().length > 0);
    if (tickers.length === 0) {
      toast.error("ticker가 입력된 종목이 없어요. 행의 ticker 칸을 먼저 채워주세요.");
      return;
    }
    startFetchingQuotes(async () => {
      const res = await refreshQuotes(tickers);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // 토스트 카운트는 setItems 전에 동기적으로 계산해야 함.
      // setItems 콜백은 비동기 실행이라 그 안에서 ++한 변수를 직후에 읽으면 항상 0.
      const quoteMap = res.quotes;
      const updated = itemsRef.current.filter(
        (it) => it.ticker && quoteMap[it.ticker] != null,
      ).length;

      setItems((prev) =>
        prev.map((it) => {
          if (!it.ticker) return it;
          const newPrice = quoteMap[it.ticker];
          if (newPrice == null) return it;
          return withComputedValue({ ...it, current_price: newPrice });
        }),
      );

      if (updated > 0) {
        toast.success(
          `${updated}개 종목 시세 갱신${res.failed.length > 0 ? ` (${res.failed.length}개 실패: ${res.failed.slice(0, 3).join(", ")}${res.failed.length > 3 ? "…" : ""})` : ""}`,
        );
      } else if (res.failed.length > 0) {
        toast.error(
          `시세 조회 실패: ${res.failed.slice(0, 3).join(", ")}${res.failed.length > 3 ? "…" : ""}. ticker가 올바른지 확인해주세요.`,
        );
      } else {
        toast.error("시세를 가져온 종목이 없어요. ticker가 비어있거나 형식이 맞지 않습니다.");
      }
    });
  };

  // 선택한 2개 이상의 행을 하나로 합친다. 가장 작은 idx의 행이 target.
  // name·ticker·region·current_price는 target 그대로 유지, quantity만 합산, value_krw 재계산.
  const mergeSelected = () => {
    if (selectedIdxs.size < 2) return;
    const idxs = [...selectedIdxs].sort((a, b) => a - b);
    const targetIdx = idxs[0];
    const absorbIdxs = new Set(idxs.slice(1));
    setItems((prev) => {
      const target = prev[targetIdx];
      if (!target) return prev;
      const sumQty = idxs.reduce(
        (s, i) => s + (prev[i]?.quantity ?? 0),
        0,
      );
      const merged = withComputedValue({ ...target, quantity: sumQty });
      return prev
        .map((it, i) => (i === targetIdx ? merged : it))
        .filter((_, i) => !absorbIdxs.has(i));
    });
    toast.success(`${selectedIdxs.size}개 행을 합쳤습니다.`);
    setSelectedIdxs(new Set());
  };

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
              <th className="w-8 px-2 py-2" aria-label="선택" />
              <th className="px-2 py-2">종목명</th>
              <th className="px-2 py-2 text-right">수량</th>
              <th className="px-2 py-2 text-right">현재가(원)</th>
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
                  // key는 인덱스만 사용 — 종목명 한 글자 바뀔 때마다 remount되면
                  // 입력 포커스가 끊긴다. flashKeys 매칭과 머지 식별엔 별도의 rowKey(it)을 그대로 씀.
                  key={idx}
                  className={`border-t border-zinc-100 transition-colors ${flash ? "bg-yellow-100" : ""} ${selectedIdxs.has(idx) ? "bg-blue-50" : ""}`}
                >
                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIdxs.has(idx)}
                      onChange={() => toggleSelected(idx)}
                      aria-label={`${idx + 1}번 행 선택`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <NameInput
                      value={it.name}
                      onCommit={(v) => updateRow(idx, { name: v })}
                    />
                    <Input
                      value={it.ticker ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        updateRow(idx, { ticker: v.length > 0 ? v : null });
                      }}
                      placeholder="ticker (예: 005930 / AAPL)"
                      className="mt-1 h-7 text-[11px] text-zinc-500"
                    />
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
                      value={it.current_price}
                      onChange={(e) =>
                        updateRow(idx, {
                          current_price: Number(e.target.value) || 0,
                        })
                      }
                      className="h-8 text-right tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-zinc-700">
                    {/* 평가금액은 quantity × current_price 자동 계산. 편집 불가. */}
                    {formatKrw(it.value_krw)}
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addBlankRow}>
            + 행 직접 추가
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selectedIdxs.size < 2}
            onClick={mergeSelected}
            title="2개 이상 선택 시 활성화. 첫 번째 선택 행이 기준이 되고 나머지 수량이 더해집니다."
          >
            선택 합치기 {selectedIdxs.size >= 2 ? `(${selectedIdxs.size})` : ""}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetchingQuotes || items.length === 0}
            onClick={refreshAllQuotes}
            title="선택된 행이 있으면 그 행만, 없으면 전체. ticker가 채워진 종목만 갱신됩니다."
          >
            {isFetchingQuotes
              ? "갱신 중…"
              : selectedIdxs.size > 0
                ? `시세 갱신 (${selectedIdxs.size})`
                : "시세 갱신"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700"
            disabled={items.length === 0}
            onClick={() => {
              if (
                window.confirm(
                  `검수 표의 ${items.length}개 항목을 모두 비울까요? 새 스크린샷부터 다시 시작할 수 있어요. (저장 전이라 DB는 영향 없음)`,
                )
              ) {
                setItems([]);
                setSelectedIdxs(new Set());
              }
            }}
          >
            전체 비우기
          </Button>
        </div>
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

// 한글 IME(조합형) 안전 입력. composition 중에는 부모 state 갱신을 지연시켜
// 매 키 입력마다 controlled value 재적용이 IME 조합을 깨뜨리는 문제를 막는다.
// 외부에서 value가 바뀌면 (예: 합치기 후) 조합 중이 아닐 때만 동기화한다.
function NameInput({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const isComposingRef = useRef(false);

  useEffect(() => {
    if (!isComposingRef.current) setLocal(value);
  }, [value]);

  return (
    <Input
      value={local}
      onChange={(e) => {
        const v = e.target.value;
        setLocal(v);
        if (!isComposingRef.current) onCommit(v);
      }}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={(e) => {
        isComposingRef.current = false;
        const v = (e.target as HTMLInputElement).value;
        setLocal(v);
        onCommit(v);
      }}
      onBlur={() => {
        // 안전망: composition 이벤트가 어떤 환경에서 누락될 경우 blur 시 강제 커밋.
        if (local !== value) onCommit(local);
      }}
      className="h-8"
    />
  );
}
