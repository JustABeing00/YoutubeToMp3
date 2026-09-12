import Link from "next/link";

/** Shared shell for informational pages: consistent width, rhythm, and return link. */
export function InfoPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-14 sm:py-20">
      <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {intro ? (
        <p className="mt-4 text-pretty text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">{intro}</p>
      ) : null}
      <div className="mt-8 space-y-8 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{children}</div>
      <p className="mt-10 border-t border-neutral-200/70 pt-6 text-sm dark:border-neutral-800/70">
        <Link
          href="/"
          className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-100"
        >
          ← Back to the Kharb converter
        </Link>
      </p>
    </main>
  );
}

export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
      {children}
    </h2>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2">{children}</p>;
}

export function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-100"
    >
      {children}
    </Link>
  );
}
