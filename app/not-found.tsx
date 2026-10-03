import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-16 sm:px-6">
        <p className="font-display text-6xl font-bold text-pine">404</p>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Aradığın sayfa burada değil.</h1>
        <p className="mt-3 max-w-[52ch] text-lg text-stone">
          Bağlantı eski olabilir ya da klinik artık listelenmiyor olabilir. Klinikleri yeniden arayabilir ya da rezervasyonuna kodunla
          ulaşabilirsin.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/klinikler" className={buttonClass("primary", "lg")}>
            Klinikleri gör
          </Link>
          <Link href="/rezervasyonum" className={buttonClass("secondary", "lg")}>
            Rezervasyonum
          </Link>
        </div>
      </main>
    </div>
  );
}
