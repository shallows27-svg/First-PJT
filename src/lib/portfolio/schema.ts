// src/lib/portfolio/schema.ts
import { z } from "zod";

// 분류 단순화: 해외 노출(미국·중국·일본·인도·선진국 ETF 등)은 'GL/US' 버킷에 통합,
// 예수금/현금은 별도 Cash 버킷. 레거시 'US'/'GLOBAL' 데이터는 coerceHoldingItem에서 GL/US로 마이그레이션.
export const REGION_VALUES = ["KR", "GL/US", "Cash"] as const;
export type Region = (typeof REGION_VALUES)[number];

// 비전 추출 결과: value_krw 없음. 서버에서 quantity × current_price로 계산해서 채운다.
// ticker는 모델이 응답에서 종종 생략(undefined)하므로 명시적으로 null 처리.
// region도 누락 시 KR로 기본화 (보수적 분류 규칙과 일치).
export const VisionItemSchema = z.object({
  ticker: z
    .preprocess((v) => v ?? null, z.string().min(1).max(20).nullable()),
  name: z.string().min(1).max(50),
  quantity: z.number().nonnegative().finite(),
  current_price: z.number().nonnegative().finite(),
  region: z
    .preprocess((v) => v ?? "KR", z.enum(REGION_VALUES)),
});
export type VisionItem = z.infer<typeof VisionItemSchema>;

export const VisionResponseSchema = z.object({
  items: z.array(VisionItemSchema).max(100),
});
export type VisionResponse = z.infer<typeof VisionResponseSchema>;

// 저장·UI 단위: value_krw는 quantity × current_price로 항상 일관되게 채워진다.
// 입력 시점·수정 시점·서버 저장 시점에서 모두 재계산되므로 drift 없다.
// type: 사용자 정의 자유 카테고리 (예: "성장", "배당", "테마"). Vision은 채우지 않고
// 빈 문자열로 시작 — 검수 단계에서 사용자가 분류한다. 차트에선 빈 값은 "미분류" 버킷.
export const HoldingItemSchema = z.object({
  ticker: z.string().min(1).max(20).nullable(),
  name: z.string().min(1).max(50),
  quantity: z.number().nonnegative().finite(),
  current_price: z.number().nonnegative().finite(),
  value_krw: z.number().nonnegative().finite(),
  region: z.enum(REGION_VALUES),
  type: z.preprocess((v) => v ?? "", z.string().max(30).default("")),
});
export type HoldingItem = z.infer<typeof HoldingItemSchema>;

export const HoldingsArraySchema = z.array(HoldingItemSchema).max(100);
