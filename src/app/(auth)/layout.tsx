import Link from "@/components/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-charcoal-900 text-sand-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 min-h-16 flex items-center">
          <Link href="/" className="rounded-lg">
            <Logo />
          </Link>
        </div>
      </header>
      <main id="main" className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white border border-sand-200 p-6 sm:p-8 shadow-sm">{children}</div>
      </main>
    </div>
  );
}
