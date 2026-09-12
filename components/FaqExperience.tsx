"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

export type FaqQA = { q: string; a: string };
export type FaqGroup = { heading: string; items: FaqQA[] };

/** Contextual deep-link per topic — idea #26: answers stay interactive. */
const GROUP_LINKS: { match: RegExp; label: string; href: string }[] = [
  { match: /using|convert/i, label: "Step-by-step guide", href: "/how-to-convert-video-to-mp3" },
  { match: /storage|deletion|files/i, label: "Privacy & deletion", href: "/privacy" },
  { match: /quality|audio/i, label: "Try the converter", href: "/#converter" },
  { match: /error|limit/i, label: "Still failing? Contact us", href: "/contact" },
  { match: /permission|privacy/i, label: "Terms of service", href: "/terms" },
];

function groupLink(heading: string) {
  return GROUP_LINKS.find((g) => g.match.test(heading));
}

type Props = {
  groups: FaqGroup[];
  /** Homepage teaser vs full /faq page. */
  variant?: "full" | "teaser";
  showSearch?: boolean;
  showCategories?: boolean;
};

const keyOf = (gi: number, ii: number) => `${gi}:${ii}`;

/**
 * Kharb FAQ experience — a curated synthesis of the 30-concept exploration.
 *
 * Ships: dramatic line-by-line entrance + giant "?" (1), two-column editorial
 * layout w/ sticky heading (2,16), alive hover (3), desktop magnetic rows (4),
 * morphing numbers (5), unfolding answers (6), plus→minus morph (7), divider
 * glow sweep (8), expanding background blob (9), cursor glow (10), scroll
 * progress rail (11), depth dimming (12), per-topic glyph (13), open-state type
 * shift (14), pulsing active dot (15), clip-wipe + staggered blur-to-sharp
 * entrance (20,22,23), breathing ambient bg (21), spring easing (24,25),
 * interactive answer links (26), category nav (27), live search (28),
 * staggered expand-all (29), completion easter egg (30).
 *
 * Deliberately rejected: horizontal scroll FAQ (17) and stacked cards (18) —
 * both fight the dark hairline editorial system and hurt scannability for
 * 10–14 questions; cursor "VIEW ANSWER" preview (19) — redundant with the
 * plus affordance and noisy on a utility page.
 */
export function FaqExperience({ groups, variant = "full", showSearch = true, showCategories = true }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const sectionRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const [isIn, setIsIn] = useState(false);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<number | "all">("all");
  const [open, setOpen] = useState<Set<string>>(() => new Set([keyOf(0, 0)]));
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [staggerAll, setStaggerAll] = useState(false);
  const showCats = showCategories && groups.length > 1;

  /* Section entrance — fires once at ~75% viewport (idea #1). */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsIn(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          io.disconnect();
          setIsIn(true);
        }
      },
      { rootMargin: "0px 0px -25% 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Cursor glow — one listener, CSS vars only (idea #10). */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const q = query.trim().toLowerCase();
  const visibleGroups = useMemo(() => {
    return groups
      .map((g, gi) => ({
        heading: g.heading,
        gi,
        items: g.items
          .map((item, ii) => ({ ...item, key: keyOf(gi, ii) }))
          .filter(
            (item) =>
              (cat === "all" || groups.indexOf(g) === cat) &&
              (q === "" || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q))
          ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, cat, q]);

  const flatKeys = useMemo(() => visibleGroups.flatMap((g) => g.items.map((i) => i.key)), [visibleGroups]);
  const totalCount = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);

  /* Scroll-spy for the progress rail + depth dimming (ideas #11, #12). */
  useEffect(() => {
    if (!isIn) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const k = (en.target as HTMLElement).dataset.faqkey;
          if (k) setActiveKey(k);
        }
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );
    rowRefs.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [isIn, visibleGroups]);

  const toggle = useCallback((key: string) => {
    setStaggerAll(false);
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setStaggerAll(true);
    setOpen(new Set(flatKeys));
    window.setTimeout(() => setStaggerAll(false), flatKeys.length * 80 + 600);
  }, [flatKeys]);

  const collapseAll = useCallback(() => {
    setStaggerAll(false);
    setOpen(new Set());
  }, []);

  const allOpen = flatKeys.length > 0 && flatKeys.every((k) => open.has(k));
  const complete = flatKeys.length > 0 && allOpen;

  /* Magnetic rows — fine pointers only, 3–8px, spring back (idea #4). */
  const magnetize = useCallback((e: React.PointerEvent, key: string) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const row = rowRefs.current.get(key);
    const inner = row?.querySelector<HTMLElement>("[data-magnet]");
    if (!row || !inner) return;
    const r = row.getBoundingClientRect();
    const dx = Math.max(-8, Math.min(8, (e.clientX - (r.left + r.width / 2)) * 0.06));
    const dy = Math.max(-5, Math.min(5, (e.clientY - (r.top + r.height / 2)) * 0.08));
    inner.style.transition = "transform 0.12s ease-out";
    inner.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
  }, []);

  const demagnetize = useCallback((key: string) => {
    const row = rowRefs.current.get(key);
    const inner = row?.querySelector<HTMLElement>("[data-magnet]");
    if (!inner) return;
    inner.style.transition = "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)";
    inner.style.transform = "translate(0, 0)";
  }, []);

  const scrollToKey = useCallback((key: string) => {
    setOpen((prev) => new Set(prev).add(key));
    const el = rowRefs.current.get(key);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const filterSig = `${cat}|${q}`;
  let rowIndex = -1;

  return (
    <section
      ref={sectionRef}
      aria-labelledby={`${uid}-title`}
      className={`faqx${isIn ? " is-in" : ""}${variant === "teaser" ? " faqx-teaser" : ""}`}
    >
      {/* Ambient layers: breathing blobs (21) + cursor glow (10) */}
      <div className="faqx-ambient" aria-hidden="true">
        <span className="faqx-blob faqx-blob-a" />
        <span className="faqx-blob faqx-blob-b" />
      </div>
      <div className="faqx-glow" aria-hidden="true" />

      <div className="faqx-grid">
        {/* ——— Left: stable editorial column (ideas #2, #16) ——— */}
        <div className="faqx-side">
          <div className="faqx-side-sticky">
            <p className="eyebrow text-inkmuted">FAQ — kharb.online</p>
            <h2 id={`${uid}-title`} className="faqx-title" aria-label="Frequently asked questions">
              <span className="faqx-title-line" style={{ ["--li" as string]: 0 }}>
                <span>FREQUENTLY</span>
              </span>
              <span className="faqx-title-line" style={{ ["--li" as string]: 1 }}>
                <span>ASKED</span>
              </span>
              <span className="faqx-title-line" style={{ ["--li" as string]: 2 }}>
                <span>QUESTIONS</span>
              </span>
            </h2>
            <span className="faqx-giant" aria-hidden="true">
              ?
            </span>
            <p className="faqx-sub">
              {totalCount} answers · {groups.length} topics. Everything about converting video to MP3 with Kharb —
              links, temporary files, quality, errors, and the rules that keep it legitimate.
            </p>

            {showSearch && (
              <div className="faqx-search" role="search">
                <label className="sr-only" htmlFor={`${uid}-search`}>
                  Search questions
                </label>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  id={`${uid}-search`}
                  type="search"
                  className="faqx-search-input"
                  placeholder="Search your question…"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button type="button" className="faqx-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                    ×
                  </button>
                )}
              </div>
            )}

            {showCats && (
              <div className="faqx-cats" role="group" aria-label="Filter by topic">
                <button
                  type="button"
                  className={`faqx-cat${cat === "all" ? " is-on" : ""}`}
                  aria-pressed={cat === "all"}
                  onClick={() => setCat("all")}
                >
                  All
                </button>
                {groups.map((g, gi) => (
                  <button
                    key={g.heading}
                    type="button"
                    className={`faqx-cat${cat === gi ? " is-on" : ""}`}
                    aria-pressed={cat === gi}
                    onClick={() => setCat(cat === gi ? "all" : gi)}
                  >
                    {g.heading}
                  </button>
                ))}
              </div>
            )}

            <div className="faqx-tools">
              <button
                type="button"
                className="faqx-expand"
                onClick={allOpen ? collapseAll : expandAll}
                aria-expanded={allOpen}
              >
                {allOpen ? "Collapse all" : "Expand all"}
                <span className={`faqx-mini-plus${allOpen ? " is-open" : ""}`} aria-hidden="true" />
              </button>
              <span className="faqx-count" role="status" aria-live="polite">
                {flatKeys.length === totalCount
                  ? `${totalCount} questions`
                  : `${flatKeys.length} of ${totalCount} match`}
              </span>
            </div>

            {/* Scroll-progress rail (idea #11) — desktop only */}
            <ol className="faqx-rail" aria-label="Questions in view">
              {flatKeys.map((k, i) => {
                const [gi, ii] = k.split(":").map(Number);
                return (
                  <li key={k}>
                    <button
                      type="button"
                      className={`faqx-rail-dot${k === activeKey ? " is-active" : ""}${
                        open.has(k) ? " is-done" : ""
                      }`}
                      onClick={() => scrollToKey(k)}
                      aria-label={`Go to question ${String(i + 1).padStart(2, "0")}: ${groups[gi].items[ii].q}`}
                      aria-current={k === activeKey ? "true" : undefined}
                    >
                      <span className="faqx-rail-num">{String(i + 1).padStart(2, "0")}</span>
                      <span className="faqx-rail-bar" />
                    </button>
                  </li>
                );
              })}
            </ol>

            {complete && (
              <p className="faqx-done" role="status">
                <span className="faqx-done-tick" aria-hidden="true">
                  ✓
                </span>
                Everything covered.
              </p>
            )}
          </div>
        </div>

        {/* ——— Right: interactive accordion (ideas #3–#9, #12, #27–#29) ——— */}
        <div className="faqx-list" key={filterSig}>
          {visibleGroups.map((g) => {
            const link = groupLink(g.heading);
            return (
              <div key={g.heading} className="faqx-group">
                <div className="faqx-group-head">
                  <h3 className="faqx-group-title">{g.heading}</h3>
                  <span className="faqx-group-count">
                    {String(g.items.length).padStart(2, "0")}
                  </span>
                </div>
                {g.items.map((item) => {
                  rowIndex += 1;
                  const ri = rowIndex;
                  const isOpen = open.has(item.key);
                  const dimmed = open.size > 0 && !isOpen;
                  const [gi, ii] = item.key.split(":").map(Number);
                  const num = `${String(gi + 1).padStart(2, "0")}`;
                  return (
                    <article
                      key={item.key}
                      ref={(el) => {
                        if (el) rowRefs.current.set(item.key, el);
                        else rowRefs.current.delete(item.key);
                      }}
                      data-faqkey={item.key}
                      style={{ ["--i" as string]: ri % 12 }}
                      className={`faqx-item${isOpen ? " is-open" : ""}${dimmed ? " is-dim" : ""}${
                        item.key === activeKey ? " is-active" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="faqx-q"
                        aria-expanded={isOpen}
                        aria-controls={`${uid}-a-${gi}-${ii}`}
                        id={`${uid}-q-${gi}-${ii}`}
                        onClick={() => toggle(item.key)}
                        onPointerMove={(e) => magnetize(e, item.key)}
                        onPointerLeave={() => demagnetize(item.key)}
                      >
                        <span className="faqx-magnet" data-magnet>
                          <span className="faqx-num" aria-hidden="true">
                            {num}
                            <span className="faqx-num-tail" />
                          </span>
                          <span className="faqx-qtext">{item.q}</span>
                          <span className="faqx-status" aria-hidden="true">
                            <span className={`faqx-dot${isOpen ? " is-on" : ""}`} />
                            <span className={`faqx-plus${isOpen ? " is-open" : ""}`}>
                              <span className="faqx-plus-h" />
                              <span className="faqx-plus-v" />
                            </span>
                          </span>
                        </span>
                      </button>
                      <div
                        className="faqx-a-wrap"
                        style={
                          staggerAll && isOpen
                            ? { transitionDelay: `${Math.min(ri, 11) * 80}ms` }
                            : undefined
                        }
                      >
                        <div
                          className="faqx-a"
                          role="region"
                          id={`${uid}-a-${gi}-${ii}`}
                          aria-labelledby={`${uid}-q-${gi}-${ii}`}
                          aria-hidden={!isOpen}
                        >
                          <div className="faqx-a-inner">
                            <p>{item.a}</p>
                            {link && (
                              <a
                                className="faqx-more"
                                href={link.href}
                                tabIndex={isOpen ? 0 : -1}
                              >
                                {link.label}
                                <span className="faqx-more-arrow" aria-hidden="true">
                                  →
                                </span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            );
          })}
          {visibleGroups.length === 0 && (
            <div className="faqx-empty" role="status">
              <p className="faqx-empty-title">No matching questions</p>
              <p className="faqx-empty-body">
                Nothing matches “{query}”. Try fewer words, or browse a topic instead.
              </p>
              <button
                type="button"
                className="faqx-cat is-on"
                onClick={() => {
                  setQuery("");
                  setCat("all");
                }}
              >
                Clear search & filters
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
