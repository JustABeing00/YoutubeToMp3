import { AboutExperience } from "@/components/AboutExperience";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "/about",
  "About",
  "Who is Kharb: an independent, privacy-focused video-to-MP3 converter. How it works, why files are temporary, and what the builder is exploring now."
);

export default function AboutPage() {
  return <AboutExperience />;
}
