import { Converter, SiteHeader } from "@/components/Converter";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 pb-20">
        <section className="mx-auto max-w-2xl px-4 pt-14 text-center sm:pt-20">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">Convert video to MP3</h1>
          <p className="mx-auto mt-4 max-w-md text-pretty text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            Paste a link to content you own or have permission to download, choose a quality, and get an MP3.
            Nothing is kept — files delete themselves.
          </p>
        </section>

        <Converter />

        <section id="how" className="mx-auto mt-16 max-w-2xl px-4">
          <h2 className="text-lg font-semibold">How it works</h2>
          <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            <li><strong className="text-neutral-900 dark:text-neutral-200">1. Paste & analyze.</strong> We validate the URL and fetch title, duration and thumbnail.</li>
            <li><strong className="text-neutral-900 dark:text-neutral-200">2. Convert.</strong> A background job retrieves the audio and transcodes it with FFmpeg — progress is real, parsed from the encoder.</li>
            <li><strong className="text-neutral-900 dark:text-neutral-200">3. Download.</strong> You get a temporary link. Source files are deleted immediately; MP3s expire automatically.</li>
          </ol>
        </section>

        <section id="privacy" className="mx-auto mt-10 max-w-2xl px-4">
          <div className="rounded-2xl border border-neutral-200 p-5 text-sm leading-relaxed text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Privacy & permission</h2>
            <p className="mt-2">
              No accounts. No permanent storage. Submitted URLs, metadata and MP3s are short-lived and deleted
              after expiry. Only convert media you own or are explicitly permitted to download, and respect the
              source platform&apos;s terms.
            </p>
          </div>
        </section>
      </main>
      <footer className="border-t border-neutral-200/70 py-6 dark:border-neutral-800/70">
        <p className="text-center text-xs text-neutral-400">
          For technical experimentation & learning. Convert only what you have rights to.
        </p>
      </footer>
    </div>
  );
}
