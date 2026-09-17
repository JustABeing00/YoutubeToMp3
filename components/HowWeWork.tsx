"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Brilean "How we work" port — applied to Kharb "How it works".
 *
 * What Brilean does (decoded from brilean.com #process):
 *  - Full-bleed dark section (near-black #1A1918), two-column grid:
 *    left = small "How we work" uppertitle pill (sticky),
 *    right = .process_container with a vertical timeline.
  *  - Timeline: 2px gray line full height + flash-blue fill that grows with
  *    scroll + a travelling icon (25px flash-blue rounded square with a black
  *    sparkle, trailing a 111px flash-blue horizontal rule).
 *  - Steps: stacked rows. Title row = big display heading left,
 *    8px status dot middle, 01/02 index right. Inactive rows are dimmed
 *    gray and collapsed; the active row is white and expands to show a
 *    description + a looping line-art visual (their Lotties:
 *    Align 5s / Design 6.1s / Build 10s / Support 13s).
 *  - Scroll: tall track (~100vh per step) with a sticky 100vh stage.
 *    GSAP ScrollTrigger scrubs fill height / icon top / active index.
 *    Lenis provides the smooth scroll. Clicking a title also activates it.
 *
 * This port keeps every one of those mechanics, minus the GSAP/Lenis
 * dependencies: tall track + sticky stage + rAF scroll scrub, same DOM
  * shape (.bri-* mirrors .process_*), same flash-blue-on-black tokens, same
 * travelling sparkle icon (inline SVG, pixel-matched to their
 * progress-icon.svg), and recreated looping line-art visuals in their
 * thin-white-stroke language — including Align's "2 circles in a cylinder".
 * Reduced-motion and no-JS fall back to a fully expanded stacked list.
 */

const STEPS = [
  {
    index: "01",
    title: "Paste & Analyze",
    body: "Paste the video URL and select Analyze. The link is validated, normalized to a canonical form, and title, duration, author, and thumbnail are fetched so you confirm the right video before anything converts.",
    visual: "align" as const,
  },
  {
    index: "02",
    title: "Convert",
    body: "Pick Original for an instant copy or MP3 at 128–320 kbps, then start the job. A background worker retrieves the source audio and prepares it with FFmpeg — queued, retrieving, processing, finalizing — with real encoder progress.",
    visual: "convert" as const,
  },
  {
    index: "03",
    title: "Download",
    body: "Get a temporary download link when the job completes. Source files are removed immediately after encoding and finished MP3s expire automatically. Expired? Just run it again.",
    visual: "download" as const,
  },
];

function SparkIcon() {
  // Pixel-matched to Brilean's progress-icon.svg:
  // 25x25 flash-blue rounded square with black sparkle + 111px blue rule.
  return (
    <svg
      width="136"
      height="25"
      viewBox="0 0 136 25"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="25" height="25" rx="2" fill="#0099ff" />
      <path
        d="M12.3828 6.81683C12.423 6.708 12.577 6.708 12.6172 6.81683L13.7216 9.80129C13.9748 10.4856 14.5144 11.0252 15.1987 11.2784L18.1832 12.3828C18.292 12.423 18.292 12.577 18.1832 12.6172L15.1987 13.7216C14.5144 13.9748 13.9748 14.5144 13.7216 15.1987L12.6172 18.1832C12.577 18.292 12.423 18.292 12.3828 18.1832L11.2784 15.1987C11.0252 14.5144 10.4856 13.9748 9.80129 13.7216L6.81683 12.6172C6.708 12.577 6.708 12.423 6.81683 12.3828L9.80129 11.2784C10.4856 11.0252 11.0252 10.4856 11.2784 9.80129L12.3828 6.81683Z"
        fill="#1A1918"
      />
      <path d="M25 12L136 12" stroke="#0099ff" strokeWidth="1.5" />
    </svg>
  );
}

function AlignVisual({ active }: { active: boolean }) {
  // Brilean Align lottie: two circles settling inside an open cylinder.
  // Thin white strokes on black, flash-blue accent on the settling circle.
  return (
    <div className="bri-visual" aria-hidden="true">
      <svg viewBox="0 0 320 220" fill="none" role="presentation">
        {/* faint grid */}
        <g stroke="rgba(255,255,255,0.08)" strokeWidth="1">
          <path d="M0 55H320M0 110H320M0 165H320M80 0V220M160 0V220M240 0V220" />
        </g>
        {/* cylinder body */}
        <g
          stroke="#fff"
          strokeWidth="1.5"
          className={active ? "bri-anim" : undefined}
        >
          <path d="M110 60 V160" />
          <path d="M210 60 V160" />
          <ellipse cx="160" cy="60" rx="50" ry="14" />
          <path d="M110 160c0 7.7 22.4 14 50 14s50-6.3 50-14" />
          <ellipse
            cx="160"
            cy="160"
            rx="50"
            ry="14"
            strokeOpacity="0.35"
            strokeDasharray="4 6"
          />
        </g>
        {/* circle one — drops in and settles */}
        <g className={active ? "bri-circle-a" : undefined}>
          <circle cx="160" cy="105" r="22" stroke="#0099ff" strokeWidth="1.5" />
          <circle cx="160" cy="105" r="4" fill="#0099ff" />
        </g>
        {/* circle two — follows and nests */}
        <g className={active ? "bri-circle-b" : undefined}>
          <circle
            cx="160"
            cy="140"
            r="14"
            stroke="#fff"
            strokeWidth="1.5"
            fill="rgba(255,255,255,0.04)"
          />
          <circle cx="160" cy="140" r="2.5" fill="#fff" />
        </g>
        {/* alignment ticks */}
        <g stroke="#0099ff" strokeWidth="1.5" strokeLinecap="round">
          <path d="M96 105h12M212 105h12" opacity="0.9" />
          <path d="M96 140h8M216 140h8" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

function ConvertVisual({ active }: { active: boolean }) {
  // Brilean Build language: cycling transcode bars + travelling pulse.
  return (
    <div className="bri-visual" aria-hidden="true">
      <svg viewBox="0 0 320 220" fill="none" role="presentation">
        <g stroke="rgba(255,255,255,0.08)" strokeWidth="1">
          <path d="M0 55H320M0 110H320M0 165H320M80 0V220M160 0V220M240 0V220" />
        </g>
        <rect
          x="60"
          y="40"
          width="200"
          height="140"
          rx="14"
          stroke="#fff"
          strokeWidth="1.5"
        />
        <g>
          <rect x="84" y="68" width="152" height="10" rx="5" fill="rgba(255,255,255,0.12)" />
          <rect
            x="84"
            y="68"
            width="152"
            height="10"
            rx="5"
            fill="#0099ff"
            className={active ? "bri-bar-a" : undefined}
          />
        </g>
        <g>
          <rect x="84" y="92" width="152" height="10" rx="5" fill="rgba(255,255,255,0.12)" />
          <rect
            x="84"
            y="92"
            width="152"
            height="10"
            rx="5"
            fill="#fff"
            className={active ? "bri-bar-b" : undefined}
          />
        </g>
        <g>
          <rect x="84" y="116" width="152" height="10" rx="5" fill="rgba(255,255,255,0.12)" />
          <rect
            x="84"
            y="116"
            width="152"
            height="10"
            rx="5"
            fill="#fff"
            opacity="0.7"
            className={active ? "bri-bar-c" : undefined}
          />
        </g>
        {/* waveform pulse */}
        <g
          stroke="#0099ff"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={active ? "bri-pulse" : undefined}
        >
          <path d="M96 152v-8M108 152v-16M120 152v-10M132 152v-20M144 152v-12M156 152v-18M168 152v-8M180 152v-14M192 152v-10M204 152v-16M216 152v-8" />
        </g>
        <g fontFamily="Inter, Arial, sans-serif" fontSize="11" fill="#A8A8A8">
          <text x="84" y="58">QUEUED → RETRIEVING → PROCESSING</text>
        </g>
      </svg>
    </div>
  );
}

function DownloadVisual({ active }: { active: boolean }) {
  // Brilean Support language: file settles into a tray, check confirms.
  return (
    <div className="bri-visual" aria-hidden="true">
      <svg viewBox="0 0 320 220" fill="none" role="presentation">
        <g stroke="rgba(255,255,255,0.08)" strokeWidth="1">
          <path d="M0 55H320M0 110H320M0 165H320M80 0V220M160 0V220M240 0V220" />
        </g>
        {/* tray */}
        <path
          d="M90 150h140l-14 26H104L90 150Z"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* falling file */}
        <g className={active ? "bri-file" : undefined}>
          <rect
            x="132"
            y="52"
            width="56"
            height="70"
            rx="8"
            stroke="#fff"
            strokeWidth="1.5"
            fill="rgba(255,255,255,0.04)"
          />
          <path
            d="M148 88l8 8 14-16"
            stroke="#0099ff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="142" y="62" width="36" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
        </g>
        {/* arrow */}
        <g
          stroke="#0099ff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={active ? "bri-arrow" : undefined}
        >
          <path d="M160 30v18M152 40l8 8 8-8" />
        </g>
        <g fontFamily="Inter, Arial, sans-serif" fontSize="11" fill="#A8A8A8">
          <text x="104" y="196">TEMP LINK · EXPIRES · NOTHING KEPT</text>
        </g>
      </svg>
    </div>
  );
}

export function HowWeWork() {
  const trackRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      return;
    }
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p =
        total <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / total));
      setProgress(p);
      const idx = Math.min(
        STEPS.length - 1,
        Math.max(0, Math.floor(p * STEPS.length + 1e-4))
      );
      setActive((prev) => (prev === idx ? prev : idx));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  const jumpTo = useCallback((i: number) => {
    const el = trackRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(i);
      el.scrollIntoView({ behavior: "auto", block: "start" });
      return;
    }
    const rect = el.getBoundingClientRect();
    const top = window.scrollY + rect.top;
    const total = rect.height - window.innerHeight;
    const target = top + (total * (i + 0.5)) / STEPS.length;
    window.scrollTo({ top: target, behavior: "smooth" });
  }, []);

  // No-JS / reduced-motion: render the Brilean stacked fallback (all open).
  const fallback = reduced;

  return (
    <section
      aria-labelledby="bri-how"
      className="bri-process"
      data-nav="dark"
      id="how"
    >
      <div
        ref={trackRef as React.RefObject<HTMLDivElement>}
        className={fallback ? "bri-track is-fallback" : "bri-track"}
      >
        <div className="bri-sticky">
          <div className="bri-global">
            <div className="bri-grid">
              <div className="bri-labelcol">
                <p className="bri-uppertitle" id="bri-how">
                  How it works
                </p>
              </div>

              <div className="bri-container">
                <div className="bri-timeline" aria-hidden="true">
                  <div className="bri-timeline__line" />
                  <div
                    className="bri-timeline__fill"
                    style={
                      fallback
                        ? { height: "100%" }
                        : { height: `${progress * 100}%` }
                    }
                  />
                  <div
                    className="bri-timeline__icon"
                    style={
                      fallback ? { top: "100%" } : { top: `${progress * 100}%` }
                    }
                  >
                    <SparkIcon />
                  </div>
                </div>

                <div className="bri-steps" role="list">
                  {STEPS.map((s, i) => {
                    const isActive = fallback ? true : i === active;
                    return (
                      <div
                        key={s.index}
                        role="listitem"
                        className={isActive ? "bri-tab active" : "bri-tab"}
                      >
                        <button
                          type="button"
                          className="bri-tabtitle"
                          aria-expanded={isActive}
                          onClick={() => (fallback ? undefined : jumpTo(i))}
                        >
                          <span className="bri-steptitle">{s.title}</span>
                          <span
                            className="bri-dot"
                            data-active={isActive ? "true" : undefined}
                          />
                          <span className="bri-stepindex">{s.index}</span>
                        </button>
                        <div className="bri-tabinner">
                          <p className="bri-stepbody">{s.body}</p>
                          {s.visual === "align" ? (
                            <AlignVisual active={isActive} />
                          ) : s.visual === "convert" ? (
                            <ConvertVisual active={isActive} />
                          ) : (
                            <DownloadVisual active={isActive} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
