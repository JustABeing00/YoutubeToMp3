import Link from "next/link";
import { Converter } from "@/components/Converter";
import { FaqExperience } from "@/components/FaqExperience";
import { HowWeWork } from "@/components/HowWeWork";
import { Reveal } from "@/components/Reveal";
import { WhyStack } from "@/components/WhyStack";
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

const HOME_FAQ_GROUPS = [
  {
    heading: "Using Kharb",
    items: [FAQS[0], FAQS[1], FAQS[2], FAQS[8]],
  },
  {
    heading: "Files and privacy",
    items: [FAQS[3], FAQS[4], FAQS[9]],
  },
  {
    heading: "Quality and limits",
    items: [FAQS[5], FAQS[6], FAQS[7]],
  },
];

export default function Home() {
  return (
    <main className="bg-transparent pb-24">
      {/* HERO — one assertive poster statement */}
      <section className="mx-auto w-full max-w-canvas px-5 pt-16 text-center sm:pt-24">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-surface1 px-[14px] py-2 text-[13px] font-medium tracking-[-0.13px] text-inkmuted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22c55e]" aria-hidden />
          No accounts · Files delete themselves
        </p>
        <Reveal as="h1" className="display-xxl mx-auto mt-6 max-w-5xl text-balance text-ink">
          Convert Video to MP3 Online
        </Reveal>
        <p className="body-lg mx-auto mt-6 max-w-xl text-pretty">
          Paste a link to content you own or have permission to download, choose a quality, and get an MP3. Nothing is
          kept — files delete themselves.
        </p>
      </section>

      <Converter />

      <div className="mx-auto w-full max-w-canvas px-5">
        {/* INTRO BAND */}
        <section aria-labelledby="what" className="mt-24">
          <p className="eyebrow text-inkmuted">What it does</p>
          <Reveal as="h2" id="what" className="display-xl mt-4 max-w-3xl text-balance text-ink">
            Fast, simple video to MP3 conversion
          </Reveal>
          <p className="subhead mt-5 max-w-2xl text-inkmuted">
            One job: turn a video link into an audio file you can keep. No account, no software — right in your
            browser.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="card-charcoal p-8">
              <p className="display-md text-ink">Narrow input, on purpose</p>
              <p className="mt-3 text-[15px] leading-[1.3] tracking-[-0.15px] text-inkmuted">
                Standard YouTube links work — youtu.be shortcuts, Shorts, embeds, music.youtube.com. Direct media
                files only from explicitly allowlisted hosts. Anything else is rejected before anything downloads. The{" "}
                <Link href="/how-to-convert-video-to-mp3" className="framer-link">
                  step-by-step guide
                </Link>{" "}
                shows exactly what to copy and where to paste it.
              </p>
            </div>
            <div className="card-charcoal p-8">
              <p className="display-md text-ink">Standard MP3 out</p>
              <p className="mt-3 text-[15px] leading-[1.3] tracking-[-0.15px] text-inkmuted">
                Output at 128, 192, 256, or 320 kbps — ready for any phone, computer, or car stereo. Archive your own
                recordings, save lectures you are allowed to keep, or carry Creative Commons material offline. Only
                submit content you own or have permission to download.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS — Brilean "How we work" 1:1 port (scroll-scrubbed timeline) */}
      </div>

      <HowWeWork />

      <div className="mx-auto w-full max-w-canvas px-5">
        {/* WHY — Brilean "What we do" stacking-deck port */}
        <div className="mt-24">
          <WhyStack />
        </div>

        {/* PRIVACY — charcoal card, same system as the rest of the site */}
        <section aria-labelledby="privacy" className="card-charcoal mt-24 p-8 sm:p-10">
          <p className="eyebrow text-inkmuted">Privacy · Temporary files</p>
          <Reveal as="h2" id="privacy" className="display-lg mt-4 max-w-2xl text-balance text-ink">
            Nothing kept. Everything expires.
          </Reveal>
          <p className="subhead mt-5 max-w-2xl text-inkmuted">
            Source material is deleted the moment transcoding finishes. Finished MP3s expire after about 30 minutes.
            Cancelling wipes files immediately.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              href="/privacy"
              className="inline-flex min-h-[44px] items-center rounded-full bg-white px-[15px] py-2.5 text-sm font-medium tracking-[-0.14px] text-black transition hover:bg-neutral-200 active:scale-[0.97]"
            >
              Read the privacy policy
            </Link>
            <Link
              href="/terms"
              className="inline-flex min-h-[44px] items-center rounded-full bg-surface2 px-[15px] py-2.5 text-sm font-medium tracking-[-0.14px] text-ink transition hover:brightness-125 active:scale-[0.97]"
            >
              Terms of service
            </Link>
          </div>
        </section>

        {/* FAQ — editorial experience (search + categories live on the FAQ page) */}
        <section aria-label="Frequently asked questions preview" className="mt-24">
          <FaqExperience groups={HOME_FAQ_GROUPS} variant="teaser" showSearch={false} showCategories={false} />
          <p className="mt-8 text-center text-[15px] leading-[1.3] tracking-[-0.15px] text-inkmuted">
            Still stuck? See the{" "}
            <Link href="/faq" className="framer-link">
              FAQ page
            </Link>
            ,{" "}
            <Link href="/about" className="framer-link">
              more about Kharb
            </Link>
            , or{" "}
            <Link href="/contact" className="framer-link">
              get in touch
            </Link>
            .
          </p>
        </section>

        {/* FINAL CTA */}
        <section className="mt-24 text-center">
          <Reveal as="h2" className="display-lg mx-auto max-w-2xl text-balance text-ink">Ready when your link is</Reveal>
          <p className="body-lg mx-auto mt-4 max-w-md">No sign-up. No installs. Just paste and convert.</p>
          <Link
            href="#converter"
            className="mt-8 inline-flex min-h-[44px] items-center rounded-full bg-white px-8 py-3.5 text-sm font-medium tracking-[-0.14px] text-black transition hover:bg-neutral-200 active:scale-[0.97]"
          >
            Convert a video now
          </Link>
        </section>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }} />
    </main>
  );
}
