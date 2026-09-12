"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-canvas bg-transparent px-5 py-24 text-center">
      <h1 className="display-lg text-ink">Something went wrong</h1>
      <p className="body-lg mx-auto mt-4 max-w-md">
        The page hit an unexpected error. Your conversions are unaffected — temporary files expire on their normal
        schedule.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-medium tracking-[-0.14px] text-black transition hover:bg-neutral-200 active:scale-[0.97]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-surface1 px-6 py-3 text-sm font-medium tracking-[-0.14px] text-ink transition hover:bg-surface2 active:scale-[0.97]"
        >
          Return to the Kharb video-to-MP3 converter
        </Link>
      </div>
    </main>
  );
}
