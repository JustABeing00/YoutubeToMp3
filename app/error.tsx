"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Something went wrong</h1>
      <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
        The page hit an unexpected error. Your conversions are unaffected — temporary files expire on their normal
        schedule.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium transition hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"
        >
          Return to the Kharb video-to-MP3 converter
        </Link>
      </div>
    </main>
  );
}
