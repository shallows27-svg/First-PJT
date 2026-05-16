import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { MockDashboard } from "@/components/landing/MockDashboard";
import { MessageForm } from "@/components/dashboard/MessageForm";
import { PortfolioForm } from "@/components/dashboard/PortfolioForm";

export const metadata = { title: "대시보드 — Portfolio X-ray" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy의 낙관적 체크에 더한 실제 검증.
  if (!user) {
    redirect("/login");
  }

  // RLS 덕분에 본인이 쓴 한 줄만 조회된다. 새로고침 시 매 요청마다 다시 읽음.
  const { data: messageRow } = await supabase
    .from("messages")
    .select("content")
    .eq("user_id", user.id)
    .maybeSingle();
  const savedLine = messageRow?.content ?? "";

  // 포트폴리오/AI 요약도 RLS로 본인 행만 조회된다.
  const { data: portfolioRow } = await supabase
    .from("portfolios")
    .select("holdings, ai_summary")
    .eq("user_id", user.id)
    .maybeSingle();
  const holdings: string = portfolioRow?.holdings ?? "";
  const aiSummary: string = portfolioRow?.ai_summary ?? "";
  const summaryLines = aiSummary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-semibold text-zinc-900">Portfolio X-ray</span>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-zinc-500 sm:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="h-9"
              >
                로그아웃
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          환영합니다 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {user.email} 님으로 로그인되었습니다. 곧 여기에서 통합 포트폴리오를
          확인할 수 있습니다.
        </p>

        <section className="mt-8 max-w-md rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">
            오늘의 한 줄
          </h2>
          {savedLine ? (
            <p className="mt-2 text-zinc-700">“{savedLine}”</p>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">
              아직 남긴 한 줄이 없습니다.
            </p>
          )}
          <div className="mt-4">
            <MessageForm defaultValue={savedLine} />
          </div>
        </section>

        <section className="mt-8 max-w-md rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">
            포트폴리오 AI 3줄 요약
          </h2>
          {summaryLines.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-zinc-700">
              {summaryLines.map((line, i) => (
                <li key={i}>• {line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">
              보유 종목을 입력하면 AI가 3줄로 요약해 드립니다.
            </p>
          )}
          <div className="mt-4">
            <PortfolioForm defaultHoldings={holdings} />
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            입력 내용은 분석을 위해 OpenRouter(Google Gemini)로 전송됩니다.
            투자 자문이 아닙니다.
          </p>
        </section>

        <div className="mt-8 flex justify-center sm:justify-start">
          <MockDashboard />
        </div>
      </div>
    </main>
  );
}
