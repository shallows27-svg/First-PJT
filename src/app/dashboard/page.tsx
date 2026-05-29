// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { MessageForm } from "@/components/dashboard/MessageForm";
import { PortfolioSection } from "@/components/dashboard/PortfolioSection";
import type { HoldingItem } from "@/lib/portfolio/schema";

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

  const { data: messageRow } = await supabase
    .from("messages")
    .select("content")
    .eq("user_id", user.id)
    .maybeSingle();
  const savedLine = messageRow?.content ?? "";

  const { data: portfolioRow } = await supabase
    .from("portfolios")
    .select("holdings_items, ai_summary")
    .eq("user_id", user.id)
    .maybeSingle();

  const savedItems = (portfolioRow?.holdings_items ?? []) as HoldingItem[];
  const savedSummary: string = portfolioRow?.ai_summary ?? "";

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

      <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            환영합니다 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {user.email} 님으로 로그인되었습니다.
          </p>
        </div>

        <section className="max-w-md rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">오늘의 한 줄</h2>
          {savedLine ? (
            <p className="mt-2 text-zinc-700">&ldquo;{savedLine}&rdquo;</p>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">
              아직 남긴 한 줄이 없습니다.
            </p>
          )}
          <div className="mt-4">
            <MessageForm defaultValue={savedLine} />
          </div>
        </section>

        <PortfolioSection
          savedItems={savedItems}
          savedSummary={savedSummary}
        />
      </div>
    </main>
  );
}
