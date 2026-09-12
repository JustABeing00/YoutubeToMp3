import { InfoPage, H2, P, InlineLink } from "@/components/InfoPage";
import { CONTACT_EMAIL, pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "/terms",
  "Terms of Service",
  "Acceptable use, user responsibility, content permissions, service limitations, and liability terms for the Kharb video-to-MP3 converter."
);

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms of Service"
      intro="By using Kharb you agree to these terms. This page summarizes the rules in plain language; it is not legal advice, and you should seek qualified counsel for your own situation."
    >
      <section aria-labelledby="acceptable">
        <H2 id="acceptable">Acceptable use</H2>
        <P>
          Kharb provides a video-to-MP3 conversion tool for lawful purposes. You may use it to convert material you
          own or have explicit permission to download. You must not use the service to infringe copyright or other
          intellectual-property rights, to violate any platform&apos;s terms of service, or to circumvent access
          controls, paywalls, or technical protection measures.
        </P>
      </section>

      <section aria-labelledby="responsibility">
        <H2 id="responsibility">Your responsibility</H2>
        <P>
          You are solely responsible for the URLs you submit and the files you download. Before converting, confirm
          that you hold the necessary rights or permission and that your use complies with the source platform&apos;s
          terms and the law where you live. If you are unsure whether you may keep a copy of something, do not
          convert it.
        </P>
      </section>

      <section aria-labelledby="ip">
        <H2 id="ip">Intellectual property and permissions</H2>
        <P>
          The service does not grant you any rights in third-party content. Converting a video does not transfer
          ownership, license the underlying work to you, or make an infringing use lawful. Audio you obtain through
          Kharb remains subject to whatever rights and restrictions applied to the source.
        </P>
      </section>

      <section aria-labelledby="limits">
        <H2 id="limits">Service limitations and availability</H2>
        <P>
          Conversion is provided on a best-effort basis with no guarantees of availability, speed, success, or output
          quality. Processing is temporary: source files are deleted after transcoding, finished MP3s expire
          automatically, and expired files cannot be recovered. The service enforces duration, size, concurrency, and
          rate limits that may change as needed, and upstream platforms may throttle or block retrieval at any time.
          Features may be modified, limited, or discontinued without notice.
        </P>
      </section>

      <section aria-labelledby="abuse">
        <H2 id="abuse">Prohibited abuse</H2>
        <P>
          You must not abuse the service: no automated bulk submission, no attempts to evade rate limits or access
          controls, no submission of malicious URLs, no probing for server-side request forgery or path traversal, and
          no activity that degrades the service for others. Abusive traffic may be rate-limited, blocked, or logged
          for security review.
        </P>
      </section>

      <section aria-labelledby="liability">
        <H2 id="liability">Disclaimer and limitation of liability</H2>
        <P>
          To the maximum extent permitted by law, the service is provided “as is” without warranties of any kind, and
          the operator is not liable for indirect, incidental, or consequential damages arising from your use of the
          service — including lost files, failed conversions, or reliance on temporary download links. Your sole
          remedy for dissatisfaction is to stop using the site.
        </P>
      </section>

      <section aria-labelledby="contact">
        <H2 id="contact">Questions</H2>
        <P>
          Questions about these terms can be sent to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 dark:text-neutral-100">
            {CONTACT_EMAIL}
          </a>
          . Also see the <InlineLink href="/privacy">privacy policy</InlineLink> and{" "}
          <InlineLink href="/faq">frequently asked questions</InlineLink>.
        </P>
      </section>
    </InfoPage>
  );
}
