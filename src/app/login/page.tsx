import { AuthForm } from "@/components/auth/AuthForm";
import { signIn } from "@/app/auth/actions";

export const metadata = { title: "로그인 — Portfolio X-ray" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16">
      <AuthForm mode="login" action={signIn} />
    </main>
  );
}
