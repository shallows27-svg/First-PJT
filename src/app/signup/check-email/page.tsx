import Link from "next/link";

export const metadata = { title: "이메일 확인 — Portfolio X-ray" };

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 text-4xl">📬</div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          이메일을 확인해주세요
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          입력하신 주소로 인증 메일을 보냈습니다. 메일의 링크를 클릭하면
          가입이 완료되고 대시보드로 이동합니다.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-emerald-700 hover:underline"
        >
          로그인 페이지로
        </Link>
      </div>
    </main>
  );
}
