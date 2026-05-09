import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Waitlist } from "@/components/landing/Waitlist";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex-1">
        <Hero />
        <Problem />
        <Features />
        <HowItWorks />
        <Waitlist />
      </main>
      <Footer />
    </div>
  );
}
