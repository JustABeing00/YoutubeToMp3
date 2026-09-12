import type { Metadata } from "next";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://kharb.online").replace(/\/$/, "");
export const SITE_NAME = "Kharb";
export const SITE_LOCALE = "en_US";
export const CONTACT_EMAIL = "onlythismoment10@gmail.com";

export const ABSOLUTE_URLS = {
  home: `${SITE_URL}/`,
  howTo: `${SITE_URL}/how-to-convert-video-to-mp3`,
  faq: `${SITE_URL}/faq`,
  privacy: `${SITE_URL}/privacy`,
  terms: `${SITE_URL}/terms`,
  about: `${SITE_URL}/about`,
  contact: `${SITE_URL}/contact`,
} as const;

export function pageMeta(path: string, title: string, description: string): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} – Kharb`,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Kharb video to MP3 converter" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} – Kharb`,
      description,
      images: ["/og-image.png"],
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    email: CONTACT_EMAIL,
  };
}

export interface FaqItem {
  q: string;
  a: string;
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
