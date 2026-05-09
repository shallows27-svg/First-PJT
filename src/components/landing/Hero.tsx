import { buttonVariants } from "@/components/ui/button";
import { MockDashboard } from "./MockDashboard";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/40 via-white to-white">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="flex flex-col items-start gap-6">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Portfolio X-ray · 사전 신청 진행 중
            </span>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-zinc-900 break-keep sm:text-3xl md:text-5xl">
              흩어진 증권 계좌를
              <br />
              한 눈에.
              <br />
              <span className="text-emerald-700">
                비중을 알면,
                <br />
                리밸런싱이 보입니다.
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-600">
              키움, 미래에셋, 토스증권… 모든 계좌의 종목을 모아 진짜
              포트폴리오를 봅니다. 비중 변화는 자동으로 추적되고,
              리밸런싱 시점은 내가 정한 기준으로 알려드립니다.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="#waitlist"
                className={buttonVariants({
                  variant: "default",
                  size: "lg",
                  className: "h-12 px-6 text-base",
                })}
              >
                사전 신청하기
              </a>
              <a
                href="#features"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "h-12 px-6 text-base",
                })}
              >
                기능 살펴보기
              </a>
            </div>
            <p className="text-xs text-zinc-500">
              출시 알림은 이메일로 한 번만 보내드려요. 스팸 없음.
            </p>
          </div>

          <div className="flex justify-center md:justify-end">
            <MockDashboard />
          </div>
        </div>
      </div>
    </section>
  );
}
