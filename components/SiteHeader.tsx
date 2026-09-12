import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200/70 dark:border-neutral-800/70">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="Kharb home">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-[15px] font-bold text-white dark:bg-white dark:text-neutral-900"
            aria-hidden
          >
            K
          </span>
          Kharb
        </Link>
        <nav className="flex items-center gap-1 text-sm" aria-label="Main">
          <Link
            href="/how-to-convert-video-to-mp3"
            className="hidden rounded-full px-3 py-1.5 text-neutral-500 transition hover:text-neutral-900 sm:inline dark:text-neutral-400 dark:hover:text-white"
          >
            How to convert
          </Link>
          <Link
            href="/faq"
            className="hidden rounded-full px-3 py-1.5 text-neutral-500 transition hover:text-neutral-900 sm:inline dark:text-neutral-400 dark:hover:text-white"
          >
            FAQ
          </Link>
          <Link
            href="/about"
            className="hidden rounded-full px-3 py-1.5 text-neutral-500 transition hover:text-neutral-900 sm:inline px-0 md:inline dark:text-neutral-400 dark:hover:text-white"
          >
            About
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
