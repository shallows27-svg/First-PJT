const problems = [
  {
    title: "매번 따로 본다",
    body: "키움, 미래에셋, 토스증권… 계좌마다 앱을 열고, 화면을 캡처하고, 엑셀에 옮겨 적습니다.",
  },
  {
    title: "진짜 비중을 모른다",
    body: "한 종목을 두 계좌에서 들고 있다면 실제 노출 비중은 얼마인가요? 통합해서 보지 않으면 알 수 없습니다.",
  },
  {
    title: "리밸런싱은 감으로",
    body: "비중이 얼마나 틀어졌을 때 정리해야 하는지, 매번 다른 기분으로 결정합니다.",
  },
];

export function Problem() {
  return (
    <section className="bg-white py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-700">
            지금 우리는
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            흩어져 있어서 손이 가는 일
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {problems.map((p, i) => (
            <div
              key={p.title}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-6"
            >
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">
                {i + 1}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-600">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
