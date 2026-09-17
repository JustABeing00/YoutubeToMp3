import { InlineLink } from "@/components/InfoPage";
import { FaqExperience } from "@/components/FaqExperience";
import { faqJsonLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "/faq",
  "Frequently Asked Questions",
  "Answers about the Kharb video-to-MP3 converter: how conversion works, file storage and deletion, audio quality, errors, permissions, and privacy."
);

const GROUPS = [
  {
    heading: "Using the converter",
    items: [
      {
        q: "What does Kharb actually do?",
        a: "Kharb takes a video link you submit, retrieves its audio on the server, and encodes that audio as an MP3 with FFmpeg at the bitrate you choose. You then download the MP3 from a temporary link. The video picture is discarded — only the sound is kept.",
      },
      {
        q: "Which links can I submit?",
        a: "Standard YouTube addresses are supported, including watch URLs, youtu.be shortcuts, Shorts, embeds, live replays, and music.youtube.com links. Direct media file URLs work only when the operator has explicitly allowlisted their host. Links from other platforms are rejected during validation, before anything is downloaded.",
      },
      {
        q: "Do I need to create an account or install anything?",
        a: "Neither. The converter runs entirely in your browser and on this site's server, with no sign-up, no sign-in, and no software to install. There is also nothing to configure: paste a link, pick a quality, convert, and download.",
      },
      {
        q: "Does it work on phones and tablets?",
        a: "Yes. Every page, including the converter, the quality selector, and the download step, is responsive and touch-friendly down to small phone screens. Keyboard users get visible focus states, labelled controls, and spoken status updates through a screen-reader live region.",
      },
    ],
  },
  {
    heading: "Files, storage, and deletion",
    items: [
      {
        q: "Where do my files go, and how long do they stay?",
        a: "Source material pulled in for a conversion is removed as soon as transcoding finishes. Finished MP3s live only until their expiry — around 30 minutes with the default settings — and a scheduled cleanup job deletes expired files along with their job records. Cancelling a conversion wipes its working files immediately.",
      },
      {
        q: "Is anything of mine stored permanently?",
        a: "No permanent archive exists. To make repeat conversions fast, recently completed results may sit briefly in a bounded on-disk cache, but that cache is size-limited and entries age out automatically. Assume anything you do not download before expiry is gone for good.",
      },
      {
        q: "My download link stopped working. What happened?",
        a: "The link expired and the file was deleted, which is the intended behavior. Re-run the conversion to get a fresh link, and save the MP3 promptly this time. Links also stop working if the job was cancelled or if cleanup removed a failed job's files.",
      },
    ],
  },
  {
    heading: "Audio quality",
    items: [
      {
        q: "Which quality settings are available?",
        a: "Two outputs: Original copies the source audio as-is (instant, smallest download), and MP3 re-encodes at four bitrates — 128, 192, 256, and 320 kbps, with 192 kbps pre-selected. Lower settings mean smaller downloads that are fine for speech; higher settings preserve more of the source at the cost of larger files.",
      },
      {
        q: "Will 320 kbps always sound better?",
        a: "Not necessarily. The MP3 can only preserve what the video's own audio contained, so a low-fidelity source will not improve at a higher bitrate — it will just take up more space. Match the setting to the source: speech and casual listening are well served at 128–192 kbps.",
      },
    ],
  },
  {
    heading: "Errors and limits",
    items: [
      {
        q: "Why did my URL get rejected?",
        a: "Either the address is malformed or it points to an unsupported host. Re-copy the link carefully, making sure it is a plain https address, and confirm the video is on a supported service. Private, deleted, and sign-in-only videos fail at the metadata step with a plain-language explanation.",
      },
      {
        q: "Why did a conversion fail halfway?",
        a: "Usually the source became unreachable, exceeded the duration or size limits, or the upstream platform throttled the download — data-center networks are throttled aggressively, and the service backs off with a cooldown instead of hammering. Waiting a few minutes before retrying with a shorter, public video is the most effective fix.",
      },
      {
        q: "What do the rate limits mean?",
        a: "To keep the service usable for everyone, each network address is limited to roughly 20 URL analyses per minute, a handful of simultaneous jobs, and about 10 new conversions per hour. Hitting one produces a 'too often' message; pausing briefly resolves it. These thresholds may be tuned by the operator.",
      },
    ],
  },
  {
    heading: "Permissions and privacy",
    items: [
      {
        q: "Am I allowed to convert any video?",
        a: "No. Convert only media you own or have explicit permission to download, and respect the source platform's terms of service and copyright law. The converter is meant for legitimate material — your own recordings, Creative Commons works, lectures and talks you are allowed to keep, and similar cases.",
      },
      {
        q: "What information does the site process about me?",
        a: "Your submitted URL and the resulting files exist only for the conversion and are deleted on the schedule described above. Network addresses are necessarily processed for rate limiting and abuse prevention, the server keeps operational logs, and an analytics tag measures aggregate usage. The privacy policy lists everything in one place.",
      },
    ],
  },
];

export default function FaqPage() {
  const flat = GROUPS.flatMap((g) => g.items);
  return (
    <main className="mx-auto w-full max-w-canvas bg-transparent px-5 py-16 sm:py-24">
      <FaqExperience groups={GROUPS} variant="full" />
      <p className="mx-auto mt-16 max-w-2xl text-center text-[15px] leading-[1.5] tracking-[-0.15px] text-inkmuted">
        New to the tool? Read <InlineLink href="/how-to-convert-video-to-mp3">how to convert a video to MP3</InlineLink>{" "}
        step by step, or <InlineLink href="/">convert a video to MP3 with our website</InlineLink> right away. Anything
        unresolved can go to the <InlineLink href="/contact">contact page</InlineLink>.
      </p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(flat)) }} />
    </main>
  );
}
