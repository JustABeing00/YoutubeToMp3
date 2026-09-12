import { ContactExperience } from "@/components/ContactExperience";
import { CONTACT_EMAIL, pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "/contact",
  "Contact",
  "Contact the maintainer of Kharb — questions, bug reports, privacy requests, and abuse reports. Compose a signal; your email app sends it."
);

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact — Kharb",
            url: "https://kharb.online/contact",
            about: {
              "@type": "Organization",
              name: "Kharb",
              email: CONTACT_EMAIL,
            },
          }),
        }}
      />
      <ContactExperience />
    </>
  );
}
