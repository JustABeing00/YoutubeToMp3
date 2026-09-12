import { HowToExperience } from "@/components/HowToExperience";
import { SITE_URL, faqJsonLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "/how-to-convert-video-to-mp3",
  "How to Convert Video to MP3 in 3 Steps",
  "Watch video become MP3: copy the link, paste it into Kharb, pick a quality, convert, and download. Interactive demo, 8-second timeline, formats, and quick answers."
);

const HOWTO_STEPS = [
  {
    q: "Which links actually work?",
    a: "Public YouTube watch URLs, youtu.be shortcuts, Shorts, embeds, and music.youtube.com. Private, deleted, sign-in-only, or region-blocked videos fail at analysis before anything downloads.",
  },
  {
    q: "What quality should I pick?",
    a: "192 kbps suits almost everything. Use 128 kbps for the smallest files and 256–320 kbps when you want to preserve the source as closely as possible.",
  },
  {
    q: "How long does conversion take?",
    a: "Seconds for short clips, longer for long videos. Progress is reported live from the real encoder, and brief queuing at busy moments is normal.",
  },
  {
    q: "Where do my files go?",
    a: "Nowhere permanent. Source material is deleted when transcoding finishes and finished MP3s expire after about 30 minutes. Cancelling wipes working files immediately.",
  },
  {
    q: "Can I convert anything I find?",
    a: "Only content you own or have explicit permission to download, and respect platform terms and copyright law.",
  },
];

function howToJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert Video to MP3 with Kharb",
    description:
      "Copy a video link you own or have permission to download, paste it into the Kharb converter, choose an audio quality, convert, and download the MP3.",
    totalTime: "PT5M",
    tool: [{ "@type": "HowToTool", name: "Kharb video to MP3 converter" }],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Copy the video URL",
        text: "Copy a public video link you own or have permission to download. Private, deleted, or sign-in-only videos cannot be analyzed.",
        url: `${SITE_URL}/how-to-convert-video-to-mp3#ht-theatre`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Paste the URL and analyze",
        text: "Paste the link into the Kharb converter and select Analyze to validate it and preview title, duration, author, and thumbnail.",
        url: `${SITE_URL}/how-to-convert-video-to-mp3#ht-demo`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Choose audio quality",
        text: "Pick 128, 192, 256, or 320 kbps. 192 kbps suits most listening; higher settings preserve more of the source but cannot restore lost detail.",
        url: `${SITE_URL}/how-to-convert-video-to-mp3#ht-try`,
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Start the conversion",
        text: "Queue the job and follow live progress from analyzing through retrieving, transcoding with FFmpeg, and finalizing. Cancel anytime to delete working files.",
        url: `${SITE_URL}/how-to-convert-video-to-mp3#ht-try`,
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Download the MP3",
        text: "Save the MP3 from its temporary link before it expires after about 30 minutes. Expired files cannot be recovered — just convert again.",
        url: `${SITE_URL}/how-to-convert-video-to-mp3#ht-try`,
      },
    ],
  };
}

function breadcrumbJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "How to Convert Video to MP3", item: `${SITE_URL}/how-to-convert-video-to-mp3` },
    ],
  };
}

export default function HowToPage() {
  return (
    <main className="bg-transparent pb-24">
      {/* Crawlable step + troubleshooting copy (visually hidden, keeps SEO depth without breaking the cinematic rhythm) */}
      <div className="sr-only">
        <h2>Step 1: Copy the video URL</h2>
        <p>
          Open the video and copy its address — a watch URL, youtu.be shortcut, or Short. Confirm it is public and
          playable; private, deleted, or sign-in-only videos cannot be analyzed.
        </p>
        <h2>Step 2: Paste the URL into the converter</h2>
        <p>
          Paste the link into the Kharb homepage converter and select Analyze. The site validates the address and shows
          title, duration, author, and thumbnail before anything converts.
        </p>
        <h2>Step 3: Choose audio quality</h2>
        <p>Pick 128, 192, 256, or 320 kbps. 192 kbps suits most listening; higher settings preserve more of the source.</p>
        <h2>Step 4: Start the conversion</h2>
        <p>
          Queue a background job and follow live progress — analyzing, retrieving, transcoding with FFmpeg, finalizing.
          Cancel anytime to delete working files immediately.
        </p>
        <h2>Step 5: Download the MP3</h2>
        <p>
          Save the MP3 before its temporary link expires after about 30 minutes. Expired files cannot be recovered.
        </p>
        <h2>Troubleshooting</h2>
        <p>
          Unsupported source means the host is not supported. Couldn&apos;t fetch information usually means a private,
          deleted, age-restricted, or region-blocked video. Sign-in required means the video is behind a login. Too
          large or duration errors mean configured limits were exceeded. Time-outs often clear after waiting a few
          minutes; repeated rapid retries can extend a cooldown. Rate limits (~20 analyses/minute, ~10 conversions/hour)
          clear after a short pause.
        </p>
      </div>

      <HowToExperience />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(HOWTO_STEPS)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd()) }} />
    </main>
  );
}
