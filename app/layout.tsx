import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Convert video to MP3 — fast, private, minimal",
  description:
    "Paste a video link you own or have permission to download, pick an MP3 quality, and get a temporary download link. Files auto-delete.",
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Convert video to MP3",
    description: "Minimal converter for content you have permission to download. Temporary files, auto-deleted.",
    url: "/",
    siteName: "VideoToMP3",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) — single site-wide tag, do not duplicate per page. */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-70T5R1L88F" />
        <Script id="google-analytics">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-70T5R1L88F');`}
        </Script>
      </head>
      <body className="min-h-screen">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
