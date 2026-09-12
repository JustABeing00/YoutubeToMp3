import { InfoPage, H2, P, InlineLink } from "@/components/InfoPage";
import { CONTACT_EMAIL, pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "/contact",
  "Contact",
  "Contact the operator of Kharb for questions, bug reports, privacy requests, and abuse reports."
);

export default function ContactPage() {
  return (
    <InfoPage
      title="Contact"
      intro="Questions about the converter, bug reports, privacy requests, and abuse reports are all welcome by email."
    >
      <section aria-labelledby="email">
        <H2 id="email">Email</H2>
        <P>
          Write to{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="framer-link"
          >
            {CONTACT_EMAIL}
          </a>
          . Include the video URL you tried (if the issue is about a specific conversion), what you expected, and the
          exact error message shown — that makes it far easier to diagnose.
        </P>
      </section>

      <section aria-labelledby="before">
        <H2 id="before">Before you write</H2>
        <P>
          Most conversion problems are already answered in{" "}
          <InlineLink href="/how-to-convert-video-to-mp3">how to convert a video to MP3</InlineLink> and the{" "}
          <InlineLink href="/faq">frequently asked questions</InlineLink>, including expired links, unsupported hosts,
          and upstream throttling. Expired files cannot be recovered, so re-running the conversion is faster than
          asking for a restore.
        </P>
      </section>

      <section aria-labelledby="abuse">
        <H2 id="abuse">Abuse and rights-holder reports</H2>
        <P>
          If you believe the service is being misused in connection with your content, email the address above with
          details of the material and your relationship to it. The service stores only temporary conversion files, so
          include anything time-sensitive promptly — expired material is deleted automatically and cannot be reviewed
          afterwards.
        </P>
      </section>
    </InfoPage>
  );
}
