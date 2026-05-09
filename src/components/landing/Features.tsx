const features = [
  {
    title: "여러 계좌를 하나의 보드로",
    body: "사용 중인 모든 증권 계좌의 종목을 한 화면에서 통합 조회합니다. 같은 종목은 합산되어 진짜 노출 규모가 보입니다.",
    icon: "📊",
  },
  {
    title: "종목별 비중 변화 자동 계산",
    body: "어제, 1주일 전, 한 달 전 대비 비중이 어떻게 움직였는지 자동 계산. 가장 빨리 부풀어 오른 종목이 무엇인지 한눈에.",
    icon: "📈",
  },
  {
    title: "내 기준으로 리밸런싱 신호",
    body: "“5%p 이상 이탈하면 알림” 같은 임계값을 직접 설정하세요. 감이 아니라 기준으로 의사결정합니다.",
    icon: "🎯",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-zinc-50 py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-700">
            핵심 기능
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            데이터로 보고, 기준으로 움직입니다
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-200 bg-white p-7 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 text-3xl">{f.icon}</div>
              <h3 className="mb-3 text-lg font-semibold text-zinc-900">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-600">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
