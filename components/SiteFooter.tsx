import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

const LINKS = [
  { href: "/how-to-convert-video-to-mp3", label: "How to Convert" },
  { href: "/faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200/70 py-8 dark:border-neutral-800/70">
      <div className="mx-auto w-full max-w-4xl px-4">
        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-neutral-500 dark:text-neutral-400">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="rounded transition hover:text-neutral-900 hover:underline dark:hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-4 text-center text-xs text-neutral-400">
          {SITE_NAME} — convert only content you own or have permission to download.
        </p>
      </div>
    </footer>
  );
}
