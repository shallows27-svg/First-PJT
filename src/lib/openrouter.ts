// 서버 전용 모듈 — 절대 "use client" 파일에서 import 하지 말 것.
// OpenRouter(OpenAI 호환 API)를 통해 Gemini로 포트폴리오를 3줄 요약한다.

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = [
  "너는 한국어로 답하는 금융 데이터 요약 도우미다.",
  "사용자가 보유한 포트폴리오(자유 텍스트)를 읽고 정확히 3줄로 설명한다.",
  "각 줄은 한 문장: 1줄 전체 구성·비중 요약, 2줄 집중도·리스크, 3줄 한 줄 특징평.",
  "매수·매도 추천이나 투자 권유는 절대 하지 말고 사실 요약만 한다.",
  "줄바꿈으로 3줄을 구분하고 번호나 불릿 기호 없이 출력한다.",
].join(" ");

export async function summarizePortfolio(holdings: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // 키 값 자체는 메시지에 절대 포함하지 않는다.
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Portfolio X-ray",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: holdings },
      ],
      temperature: 0.4,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    // 키/요청 본문이 새지 않도록 상태 코드만 노출한다.
    throw new Error(`OpenRouter request failed: ${res.status}`);
  }

  const data: {
    choices?: { message?: { content?: string } }[];
  } = await res.json();

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenRouter returned empty content");
  }

  // 빈 줄 제거 후 앞 3줄만 유지 — 정확히 "3줄 설명".
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join("\n");
}
