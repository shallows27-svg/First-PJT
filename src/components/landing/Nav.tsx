import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function Nav({ userEmail }: { userEmail?: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="font-semibold text-zinc-900">
          Portfolio <span className="text-emerald-700">X-ray</span>
        </Link>

        {userEmail ? (
          <Link
            href="/dashboard"
            className={buttonVariants({ size: "sm", className: "h-9 px-4" })}
          >
            대시보드
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "h-9 px-4",
              })}
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className={buttonVariants({ size: "sm", className: "h-9 px-4" })}
            >
              회원가입
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
