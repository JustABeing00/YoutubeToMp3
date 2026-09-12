import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

const COLS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Convert",
    links: [
      { href: "/", label: "Video to MP3" },
      { href: "/how-to-convert-video-to-mp3", label: "How to convert" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-canvas px-8 py-16">
      <div className="mx-auto w-full max-w-canvas">
        <div className="grid gap-10 md:grid-cols-[1.2fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2.5" aria-label="Kharb home">
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[15px] font-bold text-black"
                aria-hidden
              >
                K
              </span>
              <span className="text-[15px] font-semibold tracking-[-0.15px] text-ink">Kharb</span>
            </Link>
            <p className="mt-4 max-w-xs text-[13px] font-medium leading-[1.2] tracking-[-0.13px] text-inkmuted">
              Convert only content you own or have permission to download. Files delete themselves.
            </p>
            <Link
              href="/#converter"
              className="mt-5 inline-flex items-center rounded-full bg-white px-[15px] py-2.5 text-sm font-medium tracking-[-0.14px] text-black transition hover:bg-neutral-200 active:scale-[0.97]"
            >
              Start converting
            </Link>
          </div>
          {COLS.map((c) => (
            <nav key={c.heading} aria-label={c.heading}>
              <p className="text-[13px] font-medium uppercase tracking-[-0.13px] text-ink">{c.heading}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-[13px] font-medium leading-[1.2] tracking-[-0.13px] text-inkmuted transition hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-hairlinesoft pt-6 sm:flex-row sm:items-center">
          <p className="text-xs font-normal leading-[1.2] tracking-[-0.12px] text-inkmuted">
            © {new Date().getFullYear()} {SITE_NAME}. Temporary files by design.
          </p>
          <p className="text-xs font-normal leading-[1.2] tracking-[-0.12px] text-inkmuted">
            No accounts. No library. No profiles.
          </p>
        </div>
      </div>
    </footer>
  );
}
