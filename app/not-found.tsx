import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist on Kharb.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Page Not Found</h1>
      <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
        The page you&apos;re looking for doesn&apos;t exist. It may have been moved, or you may have followed an
        outdated link.
      </p>
      <p className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Return to the Kharb video-to-MP3 converter
        </Link>
      </p>
    </main>
  );
}
