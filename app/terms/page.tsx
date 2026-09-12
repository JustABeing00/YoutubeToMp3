import { TermsExperience } from "@/components/TermsExperience";
import { CONTACT_EMAIL, pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "/terms",
  "Terms of Service",
  "Acceptable use, user responsibility, content permissions, service limitations, and liability terms for the Kharb video-to-MP3 converter."
);

export default function TermsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Terms of Service — Kharb",
            url: "https://kharb.online/terms",
            description:
              "Acceptable use, user responsibility, content permissions, service limitations, and liability terms for the Kharb video-to-MP3 converter.",
            about: {
              "@type": "Organization",
              name: "Kharb",
              email: CONTACT_EMAIL,
            },
          }),
        }}
      />
      <TermsExperience />
    </>
  );
}
