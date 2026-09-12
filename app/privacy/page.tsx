import { PrivacyExperience } from "@/components/PrivacyExperience";
import { CONTACT_EMAIL, pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "/privacy",
  "Privacy Policy",
  "How Kharb handles submitted URLs, temporary files, logs, rate limiting, cookies, and analytics — and how to contact the operator."
);

export default function PrivacyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Privacy Policy — Kharb",
            url: "https://kharb.online/privacy",
            description:
              "How Kharb handles submitted URLs, temporary files, logs, rate limiting, cookies, and analytics.",
            about: {
              "@type": "Organization",
              name: "Kharb",
              email: CONTACT_EMAIL,
            },
          }),
        }}
      />
      <PrivacyExperience />
    </>
  );
}
