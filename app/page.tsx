import Link from "next/link";
import { Converter } from "@/components/Converter";
import { faqJsonLd } from "@/lib/seo";

const FAQS = [
  {
    q: "What is a video-to-MP3 converter?",
    a: "It is a tool that extracts the audio track from a video and encodes it as an MP3 file, so you can listen to the sound without keeping the picture. Kharb does this in the browser workflow: you submit a link, the server retrieves the audio and transcodes it with FFmpeg, and you download the resulting MP3.",
  },
  {
    q: "How do I convert a video to MP3?",
    a: "Paste a supported video link into the converter above, select Analyze, pick an audio quality, then start the conversion and download the MP3 from the temporary link. For the full walkthrough with troubleshooting, see how to convert a video to MP3 with our website.",
  },
  {
    q: "Do I need an account?",
    a: "No. There is no sign-up, sign-in, or subscription. Paste a link, convert, and download — nothing ties your conversions to an identity on this site.",
  },
  {
    q: "How long are uploaded or processed files stored?",
    a: "Completed MP3s are temporary and expire automatically, after about 30 minutes under the default configuration. Source files retrieved for processing are deleted immediately after the conversion finishes, and cancelling a conversion deletes its working files right away.",
  },
  {
    q: "Are files permanently stored?",
    a: "No. Nothing is kept permanently. Finished downloads expire and are removed by automatic cleanup, and repeat conversions may briefly be served from a bounded temporary cache before it ages out. There is no archive of your conversions.",
  },
  {
    q: "What audio quality can I choose?",
    a: "You can choose 128, 192, 256, or 320 kbps, with 192 kbps selected by default. A higher number produces a larger file but cannot restore detail that was already lost in the source video's own audio.",
  },
  {
    q: "Why might a video URL fail?",
    a: "The most common reasons are a private, deleted, or region-restricted video, a video that requires sign-in, a link from an unsupported host, or a video longer than the configured duration limit. Upstream services also rate-limit automated retrieval, so a failure can clear itself if you retry after a few minutes with a shorter, public video.",
  },
  {
    q: "Can I convert content I do not own?",
    a: "Only convert media you own or have explicit permission to download, and respect the source platform's terms and applicable copyright law. This service is intended for legitimate uses such as your own recordings, Creative Commons material, and other content you are allowed to keep.",
  },
  {
    q: "Is this website available on mobile?",
    a: "Yes. The converter and all information pages are responsive and work in a modern mobile browser — paste a link, choose a quality, and download the MP3 the same way you would on a desktop.",
  },
  {
    q: "What happens to my files after conversion?",
    a: "You receive a temporary download link. Once it expires, the MP3 and any remaining working files are deleted automatically. Download anything you want to keep before the link expires, because expired files cannot be recovered.",
  },
];

export default function Home() {
  return (
    <main className="pb-20">
      <section className="mx-auto max-w-2xl px-4 pt-14 text-center sm:pt-20">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">Convert Video to MP3 Online</h1>
        <p className="mx-auto mt-4 max-w-md text-pretty text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          Paste a link to content you own or have permission to download, choose a quality, and get an MP3. Nothing is
          kept — files delete themselves.
        </p>
      </section>

      <Converter />

      <div className="mx-auto max-w-2xl px-4">
        <section aria-labelledby="what" className="mt-16">
          <h2 id="what" className="text-lg font-semibold">
            Fast, Simple Video to MP3 Conversion
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            <p>
              Kharb is an online MP3 converter with one job: turn a video link into an audio file you can keep. Paste a
              supported link, check the title and duration that come back, pick a bitrate, and start the MP3
              conversion. There is no account to create and no software to install — the whole no-account workflow
              happens in your browser while the site handles retrieval and encoding.
            </p>
            <p>
              Supported input is deliberately narrow. Standard YouTube links work, including youtu.be shortcuts, Shorts,
              embeds, and music.youtube.com addresses; direct media files are accepted only from hosts the operator has
              explicitly allowlisted. Anything else is rejected before anything is downloaded. If you are unsure about a
              link, the step-by-step guide to{" "}
              <Link
                href="/how-to-convert-video-to-mp3"
                className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-100"
              >
                convert a video to MP3 with our website
              </Link>{" "}
              shows exactly what to copy and where to paste it.
            </p>
            <p>
              Output is a standard MP3 at the quality you select — 128, 192, 256, or 320 kbps — suitable for offline
              listening on any phone, computer, or car stereo. People use online audio conversion for legitimate
              everyday needs: archiving the sound from their own recordings, saving the audio of lectures and talks
              they are allowed to keep, or carrying Creative Commons material without re-streaming the video. Whatever
              you convert, only submit content you own or have permission to download.
            </p>
          </div>
        </section>

        <section aria-labelledby="how" className="mt-10">
          <h2 id="how" className="text-lg font-semibold">
            How It Works
          </h2>
          <div className="mt-3 space-y-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Paste &amp; Analyze</h3>
              <p className="mt-1">
                Paste the video URL into the converter and select Analyze. The site validates the link, normalizes it
                to a canonical form, and fetches the title, duration, author, and thumbnail so you can confirm it is
                the right video before anything is retrieved.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Convert</h3>
              <p className="mt-1">
                Choose your audio quality and start the job. A background worker retrieves the source audio and
                transcodes it with FFmpeg at your chosen bitrate, reporting real progress from the encoder — queued,
                retrieving, processing, then finalizing.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Download</h3>
              <p className="mt-1">
                When the job completes you get a temporary download link. Fetch the MP3 promptly: source files are
                removed immediately after encoding, and finished files expire automatically. If a link has expired, just
                run the conversion again.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="why" className="mt-10">
          <h2 id="why" className="text-lg font-semibold">
            Why Use This Website?
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            <p>
              The converter is built around restraint. There are no accounts, no permanent library, and no reason to
              hand over personal details to extract audio from video. You submit a link, you get a file, and the traces
              of the job are cleaned up on a schedule.
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>No sign-up: the full workflow works without an account.</li>
              <li>Honest progress: status and percentage come from the actual job, not an animation.</li>
              <li>Your choice of quality, from compact 128 kbps files to 320 kbps for careful listening.</li>
              <li>Temporary by design: working files and finished MP3s are deleted automatically.</li>
              <li>Works on desktop and mobile browsers with keyboard-accessible controls.</li>
            </ul>
            <p>
              If something goes wrong, errors are stated plainly — an unsupported link, a private video, or a busy
              server — instead of failing silently. Common cases are covered in the{" "}
              <Link
                href="/faq"
                className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-100"
              >
                frequently asked questions
              </Link>
              .
            </p>
          </div>
        </section>

        <section aria-labelledby="privacy" className="mt-10">
          <h2 id="privacy" className="text-lg font-semibold">
            Privacy &amp; Temporary Files
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            <p>
              Submitted URLs, fetched metadata, and converted audio exist only to complete your conversion. Source
              material is deleted as soon as transcoding finishes, and completed MP3s expire automatically — after
              about 30 minutes with the default settings — through scheduled cleanup. Cancelling a job removes its
              files immediately.
            </p>
            <p>
              Operating the service still requires some routine processing: IP addresses are used for rate limiting and
              abuse prevention, the server keeps operational logs, and a privacy-respecting analytics tag measures
              aggregate usage. Repeat conversions may briefly reuse a bounded temporary cache so they finish faster.
              The full details, including what is collected and how long traces remain, are in the{" "}
              <Link
                href="/privacy"
                className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-100"
              >
                privacy policy
              </Link>
              , and the ground rules for acceptable use are in the{" "}
              <Link
                href="/terms"
                className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-100"
              >
                terms of service
              </Link>
              .
            </p>
          </div>
        </section>

        <section aria-labelledby="faq" className="mt-10">
          <h2 id="faq" className="text-lg font-semibold">
            Frequently Asked Questions
          </h2>
          <div className="mt-3 space-y-5">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{f.q}</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{f.a}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Still stuck? The dedicated{" "}
            <Link
              href="/faq"
              className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-100"
            >
              FAQ page
            </Link>{" "}
            expands on these answers, or learn{" "}
            <Link
              href="/about"
              className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-100"
            >
              more about Kharb
            </Link>{" "}
            and{" "}
            <Link
              href="/contact"
              className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-100"
            >
              get in touch
            </Link>
            .
          </p>
        </section>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }} />
    </main>
  );
}
