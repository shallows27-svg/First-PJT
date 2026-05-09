export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 sm:flex-row">
        <p className="text-sm text-zinc-500">
          © 2026 Portfolio X-ray. All rights reserved.
        </p>
        <div className="flex items-center gap-5 text-sm text-zinc-500">
          <a href="#waitlist" className="hover:text-zinc-900">
            사전 신청
          </a>
          <a href="#features" className="hover:text-zinc-900">
            기능
          </a>
          <a
            href="mailto:hello@portfolio-xray.app"
            className="hover:text-zinc-900"
          >
            문의
          </a>
        </div>
      </div>
    </footer>
  );
}
