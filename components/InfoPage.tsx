import Link from "next/link";
import { Reveal } from "@/components/Reveal";

/** Shared shell for informational pages: Framer canvas, poster title, hairline rhythm. */
export function InfoPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-canvas bg-transparent px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <Reveal as="h1" className="display-lg text-balance text-ink">{title}</Reveal>
        {intro ? <p className="subhead mt-5 text-pretty text-inkmuted">{intro}</p> : null}
        <div className="mt-10 space-y-0 text-[15px] leading-[1.3] tracking-[-0.15px] text-inkmuted">
          {children}
        </div>
        <p className="mt-12 border-t border-hairlinesoft pt-6 text-sm tracking-[-0.14px]">
          <Link href="/" className="framer-link">
            ← Back to the Kharb converter
          </Link>
        </p>
      </div>
    </main>
  );
}

export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Reveal as="h2" id={id} className="pt-8 text-[22px] font-bold leading-[1.2] tracking-[-0.8px] text-ink first:pt-0">
      {children}
    </Reveal>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2">{children}</p>;
}

export function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="framer-link">
      {children}
    </Link>
  );
}
