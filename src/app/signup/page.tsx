import { AuthForm } from "@/components/auth/AuthForm";
import { signUp } from "@/app/auth/actions";

export const metadata = { title: "회원가입 — Portfolio X-ray" };

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16">
      <AuthForm mode="signup" action={signUp} />
    </main>
  );
}
