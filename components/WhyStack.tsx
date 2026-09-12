"use client";

import Link from "next/link";
import { Reveal } from "@/components/Reveal";

/**
 * Brilean "What we do" port — applied to Kharb "Why Kharb".
 *
 * What Brilean does (decoded from brilean.com .home-services):
 *  - Light section, two-column grid: left = sticky "What we do" uppertitle,
 *    right = .home-services_list of 6 pinned cards.
 *  - Each card is a horizontal row: 40px gray line-icon left, title (h6)
 *    + one-line description right. Card ~790x136px, padding 24px,
 *    radius ~8px, 4px gap. The last card is highlighted yellow and holds
 *    only a heading ("Customized").
 *  - Scroll: GSAP ScrollTrigger wraps every card in a .pin-spacer and pins
 *    it, so each following card slides up and climbs on top of the previous
 *    one — a stacking deck with a thin peeking edge. A .home-services_release
 *    div ends the pin, then .home-services_text (big closing statement +
 *    arrow link to #process) fades/slides in.
 *
 * This port keeps that architecture with zero new dependencies: pure CSS
 * `position: sticky` per card with incremental top offsets reproduces the
 * climb-on-top deck (same 4px-edge rhythm, wider offsets for taller cards),
 * the closing statement fades up on entry, and the arrow jumps to the FAQ.
 * Restyled into our dark system: charcoal cards, gray line icons, and the
 * final card in flash-blue (our accent) instead of Brilean's yellow.
 */

const CARDS = [
  {
    title: "No sign-up",
    body: "The full workflow works without an account. No identity, no library, no profiles.",
    icon: "user-off" as const,
  },
  {
    title: "Honest progress",
    body: "Status and percentage come from the actual job — queued to finalizing — not an animation.",
    icon: "gauge" as const,
  },
  {
    title: "Your quality call",
    body: "Compact 128 kbps files up to 320 kbps for careful listening. 192 kbps by default.",
    icon: "sliders" as const,
  },
  {
    title: "Temporary by design",
    body: "Working files and finished MP3s delete automatically on a schedule. Nothing to remember.",
    icon: "hourglass" as const,
    final: true,
  },
];

function CardIcon({ name }: { name: (typeof CARDS)[number]["icon"] }) {
  const common = {
    width: 40,
    height: 40,
    viewBox: "0 0 40 40",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  if (name === "user-off") {
    return (
      <svg {...common} aria-hidden="true" focusable="false">
        <circle cx="17" cy="14" r="6" />
        <path d="M6 32c1.2-5.4 5.6-8.5 11-8.5 2 0 3.9.4 5.5 1.2" />
        <path d="M7 7l26 26" />
      </svg>
    );
  }
  if (name === "gauge") {
    return (
      <svg {...common} aria-hidden="true" focusable="false">
        <path d="M7 27a13 13 0 1 1 26 0" />
        <path d="M20 27l7-8" />
        <circle cx="20" cy="27" r="2.2" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === "sliders") {
    return (
      <svg {...common} aria-hidden="true" focusable="false">
        <path d="M7 12h26M7 20h26M7 28h26" />
        <circle cx="16" cy="12" r="2.6" fill="#141414" />
        <circle cx="25" cy="20" r="2.6" fill="#141414" />
        <circle cx="14" cy="28" r="2.6" fill="#141414" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true" focusable="false">
      <path d="M12 6h16M12 34h16M13 6c0 7 5 9.5 7 13.5 2-4 7-6.5 7-13.5M13 34c0-7 5-9.5 7-13.5 2 4 7 6.5 7 13.5" />
    </svg>
  );
}

export function WhyStack() {
  return (
    <section aria-labelledby="why" className="why-stack">
      <div className="why-grid">
        <div className="why-labelcol">
          <p className="eyebrow text-inkmuted">Why Kharb</p>
          <Reveal as="h2" id="why" className="display-lg mt-4 text-balance text-ink">
            Built around restraint
          </Reveal>
        </div>

        <div className="why-deckcol">
          <ul className="why-deck">
            {CARDS.map((c, i) => (
              <li
                key={c.title}
                className={c.final ? "why-card is-final" : "why-card"}
                style={{ ["--i" as string]: i } as React.CSSProperties}
              >
                <span className="why-icon" aria-hidden="true">
                  <CardIcon name={c.icon} />
                </span>
                <span className="why-cardtext">
                  <span className="why-cardtitle">{c.title}</span>
                  <span className="why-cardbody">{c.body}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="why-closing">
            <Reveal as="p" className="why-closingtext">
              Errors are stated plainly — unsupported link, private video, busy
              server — instead of failing silently.
            </Reveal>
            <Link href="/faq" className="why-arrowlink" aria-label="See the frequently asked questions">
              <span className="why-arrow" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false">
                  <path
                    d="M3 9h11M10 4.5L14.5 9 10 13.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="why-arrowlabel">
                Common cases in the{" "}
                <span className="framer-link">frequently asked questions</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
