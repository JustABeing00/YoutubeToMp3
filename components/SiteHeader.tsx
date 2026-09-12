import Link from "next/link";

const NAV = [
  { href: "/how-to-convert-video-to-mp3", label: "How to convert" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairlinesoft bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-canvas items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Kharb home">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[15px] font-bold text-black"
            aria-hidden
          >
            K
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.15px] text-ink">Kharb</span>
        </Link>

        {/* Centered primary nav — desktop */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 min-[810px]:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium tracking-[-0.14px] text-inkmuted transition hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/how-to-convert-video-to-mp3"
            className="hidden rounded-full bg-surface1 px-[15px] py-2.5 text-sm font-medium tracking-[-0.14px] text-ink transition hover:bg-surface2 min-[810px]:inline-flex"
          >
            How it works
          </Link>
          <Link
            href="/#converter"
            className="inline-flex items-center rounded-full bg-white px-[15px] py-2.5 text-sm font-medium tracking-[-0.14px] text-black transition hover:bg-neutral-200 active:scale-[0.97]"
          >
            Convert now
          </Link>
          {/* Mobile hamburger — CSS-only disclosure via details */}
          <details className="relative min-[810px]:hidden">
            <summary
              className="inline-flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full bg-surface1 text-ink [&::-webkit-details-marker]:hidden"
              aria-label="Open menu"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M2 4.5h12M2 8h12M2 11.5h12" strokeLinecap="round" />
              </svg>
            </summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 top-12 w-56 rounded-[20px] border-t border-white/10 bg-surface1 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
            >
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="block rounded-[10px] px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface2"
                >
                  {n.label}
                </Link>
              ))}
              <Link
                href="/#converter"
                className="mt-1 block rounded-[10px] bg-white px-4 py-2.5 text-center text-sm font-medium text-black"
              >
                Convert now
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
