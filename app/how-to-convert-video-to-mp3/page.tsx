import { InfoPage, H2, P, InlineLink } from "@/components/InfoPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "/how-to-convert-video-to-mp3",
  "How to Convert a Video to MP3",
  "Step-by-step guide to converting a video to MP3 with Kharb: copy the link, paste it into the converter, choose a quality, convert, and download."
);

export default function HowToPage() {
  return (
    <InfoPage
      title="How to Convert a Video to MP3"
      intro="Five short steps take you from a video link to an MP3 on your device. Only convert content you own or have permission to download."
    >
      <section aria-labelledby="step1">
        <H2 id="step1">Step 1: Copy the Video URL</H2>
        <P>
          Open the video in your browser or app and copy its address. On YouTube this is the watch URL, a youtu.be
          shortcut, or the address of a Short — any of these work because they all point to the same video. Double
          check that the video is public and playable: private, deleted, or sign-in-only videos cannot be analyzed,
          and the converter will tell you so rather than guessing.
        </P>
      </section>

      <section aria-labelledby="step2">
        <H2 id="step2">Step 2: Paste the URL into the website&apos;s conversion tool</H2>
        <P>
          Go to the Kharb homepage and paste the link into the converter input, then select Analyze. The site
          validates the address, strips tracking parameters, and shows you the video&apos;s title, duration, author,
          and thumbnail. If the details don&apos;t match the video you intended, stop here and re-copy the link —
          converting starts only when you say so.
        </P>
        <P>
          <InlineLink href="/">Convert a video to MP3 with our website</InlineLink> — the converter is at the top of
          the homepage and works without an account.
        </P>
      </section>

      <section aria-labelledby="step3">
        <H2 id="step3">Step 3: Choose Your Audio Quality</H2>
        <P>
          After analysis you can pick an MP3 bitrate: 128, 192, 256, or 320 kbps. The default of 192 kbps suits most
          listening — speech, podcasts, and casual music playback. Choose 128 kbps for the smallest files, or 256–320
          kbps when you want to preserve as much of the source as possible. Keep in mind that a higher setting cannot
          add detail the original video&apos;s audio never had.
        </P>
      </section>

      <section aria-labelledby="step4">
        <H2 id="step4">Step 4: Start the Conversion</H2>
        <P>
          Select the convert button to queue a background job. Progress is reported live from the actual work being
          done — analyzing, retrieving the source audio, transcoding with FFmpeg, and finalizing. Longer videos take
          longer, and only a couple of jobs run at once, so brief queuing at busy moments is normal. You can cancel at
          any time; cancelling deletes the job&apos;s working files immediately.
        </P>
      </section>

      <section aria-labelledby="step5">
        <H2 id="step5">Step 5: Download the MP3</H2>
        <P>
          When the job completes, a temporary download link appears with the file name and size. Save the MP3 before
          the link expires — finished files are deleted automatically after about 30 minutes under the default
          configuration, and expired files cannot be recovered. If a link has lapsed, simply run the conversion again.
        </P>
      </section>

      <section aria-labelledby="troubleshooting">
        <H2 id="troubleshooting">Troubleshooting</H2>
        <div className="mt-2 space-y-3">
          <P>
            <strong className="text-neutral-900 dark:text-neutral-100">“Unsupported source.”</strong> The link is not
            from a supported host. Standard YouTube addresses work; most other sites do not.
          </P>
          <P>
            <strong className="text-neutral-900 dark:text-neutral-100">“Couldn&apos;t fetch information.”</strong> The
            video may be private, deleted, age-restricted, or region-blocked. Confirm it plays in a signed-out browser
            window and try again.
          </P>
          <P>
            <strong className="text-neutral-900 dark:text-neutral-100">“Requires sign-in.”</strong> Videos behind a
            login cannot be converted. Only public content you are allowed to download will work.
          </P>
          <P>
            <strong className="text-neutral-900 dark:text-neutral-100">“Too large” or duration errors.</strong> The
            video exceeds the configured duration or size limits. Try a shorter video.
          </P>
          <P>
            <strong className="text-neutral-900 dark:text-neutral-100">Time-outs and retrieval failures.</strong>{" "}
            Upstream platforms throttle automated downloads, especially from data-center networks. Waiting a few
            minutes and retrying — ideally with a shorter video — often succeeds. Repeated rapid retries can extend a
            cooldown, so pace your attempts.
          </P>
          <P>
            <strong className="text-neutral-900 dark:text-neutral-100">“Too often, wait a moment.”</strong> You hit a
            rate limit (roughly 20 analyses per minute or 10 conversions per hour per address). Pause briefly and
            continue.
          </P>
        </div>
        <P>
          More answers live in the <InlineLink href="/faq">frequently asked questions</InlineLink>, and the{" "}
          <InlineLink href="/privacy">privacy policy</InlineLink> explains what happens to submitted links and
          temporary files.
        </P>
      </section>
    </InfoPage>
  );
}
