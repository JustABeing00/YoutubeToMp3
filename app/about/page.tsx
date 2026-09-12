import { InfoPage, H2, P, InlineLink } from "@/components/InfoPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "/about",
  "About",
  "What Kharb is, how the video-to-MP3 converter works, why it is designed around temporary files, and who operates it."
);

export default function AboutPage() {
  return (
    <InfoPage
      title="About Kharb"
      intro="Kharb is a small, privacy-focused website that converts video links into MP3 audio files — nothing more, and nothing kept afterwards."
    >
      <section aria-labelledby="what">
        <H2 id="what">What this website does</H2>
        <P>
          The site offers a single tool: paste a supported video link, choose an MP3 quality, and download the
          resulting audio. The server validates the link, retrieves the audio track, transcodes it with FFmpeg, and
          hands you a temporary download link. The workflow needs no account and installs nothing on your device.
        </P>
      </section>

      <section aria-labelledby="design">
        <H2 id="design">Privacy-focused by design</H2>
        <P>
          Most converters treat your uploads as inventory. Kharb treats them as scratch space: source files are
          deleted the moment transcoding finishes, finished MP3s expire automatically, and cleanup runs on a schedule
          whether or not you remember to delete anything. There are no accounts to breach, no libraries to leak, and
          no profiles to build — just rate limiting and operational logs to keep the service running.
        </P>
      </section>

      <section aria-labelledby="purpose">
        <H2 id="purpose">Why it exists</H2>
        <P>
          The project started as a technical exercise in media processing — queuing background jobs, parsing real
          encoder progress, and handling the failure modes of automated downloads honestly. It remains deliberately
          narrow: one converter, done carefully, with plain-language errors and documented limits, instead of a maze
          of doorway pages and exaggerated claims.
        </P>
      </section>

      <section aria-labelledby="operator">
        <H2 id="operator">Who operates it</H2>
        <P>
          Kharb is an independent project run by its developer. There is no company marketing department, no
          investors, and no ad network calling the shots — the contact below reaches the person who actually maintains
          the service.
        </P>
      </section>

      <section aria-labelledby="contact">
        <H2 id="contact">Contact</H2>
        <P>
          Questions, bug reports, and removal requests are welcome on the{" "}
          <InlineLink href="/contact">contact page</InlineLink>. Practical guidance lives in{" "}
          <InlineLink href="/how-to-convert-video-to-mp3">how to convert a video to MP3</InlineLink> and the{" "}
          <InlineLink href="/faq">frequently asked questions</InlineLink>.
        </P>
      </section>
    </InfoPage>
  );
}
