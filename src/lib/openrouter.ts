// 서버 전용 모듈 — 절대 "use client" 파일에서 import 하지 말 것.
// OpenRouter(OpenAI 호환 API) 공용 chat completions 어댑터.
// vision.ts / summary.ts 가 모델·프롬프트·옵션을 들고 이쪽에 위임한다.
// 키 가드·타임아웃·에러 정제만 담당.

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// ────────────────────────────────────────────────────────────────────────────

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
};

export type CallChatOptions = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
  timeoutMs?: number;
};

export async function callChatCompletion(opts: CallChatOptions): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 30_000,
  );

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Portfolio X-ray",
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        temperature: opts.temperature,
        max_tokens: opts.max_tokens,
        response_format: opts.response_format,
      }),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("OpenRouter request timed out");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new Error(`OpenRouter request failed: ${res.status}`);
  }

  const data: { choices?: { message?: { content?: string } }[] } =
    await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenRouter returned empty content");
  }
  return text;
}
