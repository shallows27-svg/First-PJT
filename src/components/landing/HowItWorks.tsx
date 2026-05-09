const steps = [
  {
    title: "계좌 정보 등록",
    body: "보유 중인 증권 계좌를 추가합니다. 잔고 정보를 안전하게 가져옵니다.",
  },
  {
    title: "통합 분석 확인",
    body: "모든 계좌의 종목과 비중을 한 화면에서 보고, 변화 그래프로 흐름을 읽습니다.",
  },
  {
    title: "리밸런싱 임계값 설정",
    body: "내가 정한 기준에서 벗어나면 알림이 옵니다. 어디를 정리하고 어디를 늘릴지 명확해집니다.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-white py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-700">
            사용 흐름
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            세 단계면 충분합니다
          </h2>
        </div>

        <ol className="grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="relative">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-base font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-600">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
