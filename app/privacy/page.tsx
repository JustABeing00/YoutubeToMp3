import { InfoPage, H2, P, InlineLink } from "@/components/InfoPage";
import { CONTACT_EMAIL, pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "/privacy",
  "Privacy Policy",
  "How Kharb handles submitted URLs, temporary files, logs, rate limiting, cookies, and analytics — and how to contact the operator."
);

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      intro="Kharb is designed to hold as little as possible for as short as possible. This page describes what is actually processed when you use the converter."
    >
      <section aria-labelledby="submitted">
        <H2 id="submitted">What you submit</H2>
        <P>
          When you convert, you submit a video URL and a quality setting. The server normalizes the URL, fetches public
          metadata about the video (title, duration, author, thumbnail reference), retrieves the source audio, and
          transcodes it to MP3. Submitted URLs and fetched metadata exist only to complete the conversion.
        </P>
      </section>

      <section aria-labelledby="files">
        <H2 id="files">Temporary files and deletion</H2>
        <P>
          Source files retrieved for processing are deleted immediately after transcoding finishes. Completed MP3s are
          temporary: they expire automatically — after about 30 minutes under the default configuration — and a
          scheduled cleanup task removes expired files and their job records. Cancelling a conversion deletes its
          working files right away. Recently completed results may sit briefly in a bounded on-disk cache so repeat
          conversions finish faster; cache entries are size-limited and age out automatically.
        </P>
      </section>

      <section aria-labelledby="network">
        <H2 id="network">Network addresses, logs, and rate limiting</H2>
        <P>
          Your IP address is necessarily processed to deliver the service: it is used for rate limiting (roughly 20
          URL analyses per minute, a handful of concurrent jobs, and about 10 new conversions per hour per address)
          and for abuse prevention. The server keeps operational logs for reliability and security monitoring, and IP
          information may appear in those logs and in transient job records until they expire. Logs are not sold and
          are not used for advertising.
        </P>
      </section>

      <section aria-labelledby="analytics">
        <H2 id="analytics">Analytics, cookies, and third-party services</H2>
        <P>
          The site uses Google Analytics (gtag.js) to measure aggregate usage — including page views and conversion
          interactions such as analysis attempts, successful conversions, and conversion errors. Google Analytics sets
          its own cookies and processes usage data on Google&apos;s servers subject to Google&apos;s policies. No
          other advertising, cross-site tracking, or social-media widgets are embedded. The site&apos;s own
          functionality does not require accounts and stores no account data, because accounts do not exist.
        </P>
      </section>

      <section aria-labelledby="hosting">
        <H2 id="hosting">Hosting and server processing</H2>
        <P>
          All conversion work happens on the server that hosts this site: URL validation, metadata fetching, media
          retrieval, FFmpeg transcoding, and file delivery. Video thumbnails shown during analysis are loaded from the
          source platform&apos;s servers. Standard hosting realities apply — TLS termination, reverse proxies, and
          infrastructure logs outside this application&apos;s control may record connection metadata.
        </P>
      </section>

      <section aria-labelledby="rights">
        <H2 id="rights">Your choices and contact</H2>
        <P>
          Because there are no accounts, there is no account data to export or delete — and because files expire
          automatically, the most effective privacy control is simply letting conversions lapse. If you have questions
          about this policy or believe something is being retained that should not be, contact the operator at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-100">
            {CONTACT_EMAIL}
          </a>
          . See also the <InlineLink href="/terms">terms of service</InlineLink> and the{" "}
          <InlineLink href="/how-to-convert-video-to-mp3">conversion guide</InlineLink>.
        </P>
      </section>
    </InfoPage>
  );
}
