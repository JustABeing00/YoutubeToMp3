import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist on Kharb.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-canvas bg-transparent px-5 py-24 text-center">
      <h1 className="display-lg text-ink">Page Not Found</h1>
      <p className="body-lg mx-auto mt-4 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist. It may have been moved, or you may have followed an
        outdated link.
      </p>
      <p className="mt-8">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-medium tracking-[-0.14px] text-black transition hover:bg-neutral-200 active:scale-[0.97]"
        >
          Return to the Kharb video-to-MP3 converter
        </Link>
      </p>
    </main>
  );
}
