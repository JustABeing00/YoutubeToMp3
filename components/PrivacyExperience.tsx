"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { CONTACT_EMAIL } from "@/lib/seo";

/* ------------------------------------------------------------------ */
/* Zero-dep, reduced-motion-aware primitives (same language as About)   */
/* ------------------------------------------------------------------ */

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

function useInViewOnce<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { threshold, rootMargin: "0px 0px -12% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/** Tall-track scrub: 0 when track top meets viewport top, 1 at bottom. */
function useScrub(trackRef: React.RefObject<HTMLElement>, disabled: boolean) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (disabled) return;
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const v = total <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / total));
      setP((prev) => (Math.abs(prev - v) < 0.0005 ? prev : v));
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
  }, [trackRef, disabled]);
  return p;
}

function useCountUp(target: number, run: boolean, duration = 1300) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setValue(Math.round(target * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, duration]);
  return value;
}

/* ------------------------------------------------------------------ */
/* Scroll reveal + marker highlight (calm: 16–30px rise, staggered)     */
/* ------------------------------------------------------------------ */

function PvReveal({
  as = "div",
  id,
  className = "",
  delay = 0,
  children,
}: {
  as?: "h2" | "h3" | "p" | "div" | "li" | "span";
  id?: string;
  className?: string;
  delay?: 0 | 1 | 2;
  children: ReactNode;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);
  const Tag = as as "div";
  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      id={id}
      className={`pv-reveal${inView ? " is-in" : ""} pv-d${delay} ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Marker-draw highlight: sweeps left → right when scrolled into view. */
function Mark({ children }: { children: ReactNode }) {
  const { ref, inView } = useInViewOnce<HTMLSpanElement>(0.6);
  return (
    <span ref={ref} className={inView ? "pv-mark is-in" : "pv-mark"}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Table of contents + journey metadata                                */
/* ------------------------------------------------------------------ */

const TOC = [
  { id: "overview", n: "01", label: "Overview" },
  { id: "submit", n: "02", label: "What you submit" },
  { id: "temporary", n: "03", label: "Temporary files" },
  { id: "network", n: "04", label: "IP & logs" },
  { id: "analytics", n: "05", label: "Analytics" },
  { id: "processing", n: "06", label: "Server processing" },
  { id: "choices", n: "07", label: "Your choices" },
] as const;

function useSpy(ids: readonly string[]) {
  const [active, setActive] = useState<string>(ids[0]);
  useEffect(() => {
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((e): e is HTMLElement => e !== null);
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) setActive(en.target.id);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

/* ------------------------------------------------------------------ */
/* Hero — calm staged entrance (fade → rise → blur-to-sharp)            */
/* ------------------------------------------------------------------ */

function Hero({ reduced }: { reduced: boolean }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [k, setK] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      setK(Math.min(1, window.scrollY / Math.max(1, window.innerHeight)));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <section ref={rootRef} id="overview" aria-labelledby="pv-hero" className="pv-hero">
      <div className="pv-hero-glow" aria-hidden="true" />
      {/* particle stream: data enters → processes → disappears */}
      <div className="pv-stream" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <i key={i} style={{ ["--i" as string]: i } as CSSProperties} />
        ))}
      </div>
      <div
        className="pv-hero-inner"
        style={
          reduced
            ? undefined
            : {
                opacity: 1 - k * 0.85,
                transform: `translateY(${-k * 70}px)`,
                filter: `blur(${(k * 5).toFixed(1)}px)`,
              }
        }
      >
        <p className="pv-eyebrow">
          <span className="pv-live-dot" aria-hidden="true" />
          Privacy · Kharb.online · temporary by design
        </p>
        <h1 id="pv-hero" className="pv-hero-title">
          <span className="pv-line pv-l1">Your data.</span>
          <span className="pv-line pv-l2">Handled temporarily.</span>
          <span className="pv-line pv-l3">Deleted automatically.</span>
        </h1>
        <p className="pv-hero-sub">
          Kharb is designed to hold as little as possible for as short as possible.
        </p>
        <div className="pv-hero-path" aria-hidden="true">
          <span>Input</span>
          <i>→</i>
          <span>Process</span>
          <i>→</i>
          <span>Output</span>
          <i>→</i>
          <span className="is-del">Delete</span>
        </div>
        <div className="pv-hero-ctas">
          <a href="#lifecycle" className="pv-btn-primary">
            See the lifecycle
          </a>
          <a href="#submit" className="pv-btn-secondary">
            Read the policy
          </a>
        </div>
      </div>
      <a href="#lifecycle" className="pv-scrollcue" aria-label="Scroll to the data lifecycle">
        <span className="pv-scrollcue-line" aria-hidden="true" />
        <span>Scroll</span>
      </a>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Data lifecycle — scroll-linked flow YOU → DELETE                     */
/* ------------------------------------------------------------------ */

const LIFE_STAGES = [
  { k: "YOU", d: "Your browser. Nothing installed, no account." },
  { k: "URL + QUALITY", d: "The link and quality you submit." },
  { k: "PROCESS", d: "Metadata · audio · FFmpeg on the server." },
  { k: "MP3", d: "A temporary download, ready for minutes." },
  { k: "DELETE", d: "Expired automatically. Nothing kept." },
] as const;

function Lifecycle({ reduced }: { reduced: boolean }) {
  const trackRef = useRef<HTMLElement | null>(null);
  const p = useScrub(trackRef, reduced);
  const idx = Math.min(LIFE_STAGES.length - 1, Math.floor(p * LIFE_STAGES.length));
  const dissolve = p > 0.82 ? (p - 0.82) / 0.18 : 0;
  return (
    <section
      ref={trackRef}
      id="lifecycle"
      aria-labelledby="lifecycle-h"
      className={reduced ? "pv-life is-fallback" : "pv-life"}
    >
      <div className="pv-life-sticky">
        <div className="pv-life-inner">
          <PvReveal as="p" className="eyebrow text-inkmuted">
            The centerpiece · your data has a lifecycle
          </PvReveal>
          <PvReveal as="h2" id="lifecycle-h" delay={1} className="display-lg pv-h">
            What enters, what happens, what disappears.
          </PvReveal>
          <div className="pv-life-rail" role="list" aria-label="Data lifecycle stages">
            <div className="pv-life-track" aria-hidden="true">
              <span className="pv-life-line" />
              <span className="pv-life-fill" style={{ transform: `scaleX(${reduced ? 1 : p})` }} />
              <span
                className="pv-life-dot"
                style={{ left: `${(reduced ? 1 : p) * 100}%` }}
              />
            </div>
            <ol className="pv-life-nodes">
              {LIFE_STAGES.map((s, i) => (
                <li
                  key={s.k}
                  role="listitem"
                  className={
                    i === idx
                      ? "pv-life-node is-on"
                      : i < idx
                        ? "pv-life-node is-done"
                        : "pv-life-node"
                  }
                  aria-current={i === idx ? "step" : undefined}
                >
                  <span className="pv-life-k">{s.k}</span>
                  <span className="pv-life-d">{s.d}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="pv-life-stage" aria-live="polite">
            <p className="pv-life-count">
              {String(idx + 1).padStart(2, "0")} / {String(LIFE_STAGES.length).padStart(2, "0")}
            </p>
            <p
              key={LIFE_STAGES[idx].k}
              className="display-md pv-life-word"
              style={
                reduced
                  ? undefined
                  : {
                      opacity: 1 - dissolve,
                      filter: `blur(${(dissolve * 10).toFixed(1)}px)`,
                      transform: `translateY(${(-dissolve * 18).toFixed(1)}px) scale(${(1 - dissolve * 0.06).toFixed(3)})`,
                    }
              }
            >
              {idx === LIFE_STAGES.length - 1 ? "File deleted" : LIFE_STAGES[idx].k}
            </p>
            <p className="pv-life-cap">
              {idx === LIFE_STAGES.length - 1
                ? "Particles scatter, the record expires, the job is gone."
                : "Scroll — the URL travels the path, becomes an MP3, then fades away."}
            </p>
            <div className="pv-life-bits" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, i) => (
                <i
                  key={i}
                  style={
                    {
                      ["--i" as string]: i,
                      opacity: idx === LIFE_STAGES.length - 1 ? Math.max(0, 1 - dissolve * 1.4 - i * 0.05) : 0.9,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          </div>
          {reduced ? (
            <ol className="pv-fallback-list">
              {LIFE_STAGES.map((s) => (
                <li key={s.k}>
                  <strong>{s.k}.</strong> {s.d}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* What you submit — interactive cards + full policy text               */
/* ------------------------------------------------------------------ */

function Submit() {
  const [hover, setHover] = useState<"url" | "quality" | null>(null);
  return (
    <section id="submit" aria-labelledby="submit-h" className="pv-section">
      <PvReveal as="p" className="eyebrow text-inkmuted">
        02 · What enters Kharb
      </PvReveal>
      <PvReveal as="h2" id="submit-h" delay={1} className="display-lg pv-h">
        What you submit.
      </PvReveal>
      <PvReveal as="p" delay={2} className="pv-lead">
        Two things — and nothing else is required.
      </PvReveal>
      <div className="pv-cards2">
        <button
          type="button"
          className={hover === "url" ? "pv-card is-on" : "pv-card"}
          onMouseEnter={() => setHover("url")}
          onMouseLeave={() => setHover(null)}
          onFocus={() => setHover("url")}
          onBlur={() => setHover(null)}
          aria-describedby="submit-url-tip"
        >
          <span className="pv-card-k">Video URL</span>
          <span className="pv-card-v">Your submitted link</span>
          <span id="submit-url-tip" className="pv-card-tip">
            Used to locate and process the requested public video.
          </span>
        </button>
        <button
          type="button"
          className={hover === "quality" ? "pv-card is-on" : "pv-card"}
          onMouseEnter={() => setHover("quality")}
          onMouseLeave={() => setHover(null)}
          onFocus={() => setHover("quality")}
          onBlur={() => setHover(null)}
          aria-describedby="submit-q-tip"
        >
          <span className="pv-card-k">Quality</span>
          <span className="pv-card-v">Your selected setting · 128–320 kbps</span>
          <span id="submit-q-tip" className="pv-card-tip">
            Used to determine the requested conversion quality.
          </span>
        </button>
      </div>
      <div className="pv-policy" aria-labelledby="submitted">
        <h3 id="submitted" className="pv-policy-h">
          The policy, in full — <a href="#submitted" className="framer-link">what you submit</a>
        </h3>
        <p>
          When you convert, you submit a video URL and a quality setting. The server normalizes
          the URL, fetches public metadata about the video (title, duration, author, thumbnail
          reference), retrieves the source audio, and transcodes it to MP3. Submitted URLs and
          fetched metadata exist <Mark>only to complete the conversion</Mark>.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Temporary by design — looping countdown + 30-min scroll moment       */
/* ------------------------------------------------------------------ */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Countdown({ reduced }: { reduced: boolean }) {
  const [t, setT] = useState(0.32);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setT((v) => (v >= 1 ? 0 : v + 1 / 140));
    }, 100);
    return () => window.clearInterval(id);
  }, [reduced]);
  const CYCLE = 30 * 60;
  const remaining = Math.max(0, Math.round(CYCLE * (1 - t)));
  const label = `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`;
  const deleted = t >= 0.985;
  return (
    <div className="pv-count" role="img" aria-label="Illustration: a temporary MP3 counting down from about 30 minutes to automatic deletion.">
      <div className="pv-count-top">
        <span className="pv-count-file">result.mp3</span>
        <span className={deleted ? "pv-count-time is-del" : "pv-count-time"} aria-hidden="true">
          {deleted ? "00:00" : label}
        </span>
      </div>
      <div className="pv-count-bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${deleted ? 0 : 1 - t})` }} />
      </div>
      <div className="pv-count-foot" aria-hidden="true">
        <span>{deleted ? "FILE DELETED" : `${label} remaining`}</span>
        <span className="pv-count-pct">{deleted ? "0%" : `${Math.round((1 - t) * 100)}%`}</span>
      </div>
      {deleted ? <p className="pv-count-gone">The card empties itself — then it is gone.</p> : null}
    </div>
  );
}

function ThirtyMinutes({ reduced }: { reduced: boolean }) {
  const trackRef = useRef<HTMLElement | null>(null);
  const p = useScrub(trackRef, reduced);
  const showZero = p >= 0.5;
  const dissolve = p > 0.85 ? (p - 0.85) / 0.15 : 0;
  return (
    <section
      ref={trackRef}
      aria-label="Typical expiration window: about 30 minutes"
      className={reduced ? "pv-thirty is-fallback" : "pv-thirty"}
    >
      <div className="pv-thirty-sticky">
        <div
          className="pv-thirty-inner"
          style={
            reduced
              ? undefined
              : { opacity: 1 - dissolve, filter: `blur(${(dissolve * 12).toFixed(1)}px)` }
          }
        >
          <p className="eyebrow text-inkmuted">Temporary · not permanent</p>
          <p className="pv-thirty-giant" aria-live="polite">
            {showZero ? "0 min" : "~30 min"}
          </p>
          <p className="pv-thirty-cap">
            {showZero ? "Automatically expired" : "Typical expiration window"}
          </p>
          <div className="pv-thirty-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${reduced ? 0.5 : 1 - p})` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Temporary({ reduced }: { reduced: boolean }) {
  return (
    <section id="temporary" aria-labelledby="temporary-h" className="pv-section">
      <PvReveal as="p" className="eyebrow text-inkmuted">
        03 · Temporary files
      </PvReveal>
      <PvReveal as="h2" id="temporary-h" delay={1} className="display-lg pv-h">
        Temporary.
        <br />
        Not permanent.
      </PvReveal>
      <PvReveal as="p" delay={2} className="pv-lead">
        Completed files <Mark>expire automatically</Mark> — and cancelled conversions
        delete working files immediately.
      </PvReveal>
      <PvReveal delay={2} className="pv-tempgrid">
        <Countdown reduced={reduced} />
        <div className="pv-ticks" aria-hidden="true">
          {["100%", "50%", "10%", "0% — deleted"].map((s, i) => (
            <span key={s} style={{ ["--i" as string]: i } as CSSProperties}>
              {s}
            </span>
          ))}
        </div>
      </PvReveal>
      <ThirtyMinutes reduced={reduced} />
      <div className="pv-policy" aria-labelledby="files">
        <h3 id="files" className="pv-policy-h">
          The policy, in full — <a href="#files" className="framer-link">temporary files and deletion</a>
        </h3>
        <p>
          Source files retrieved for processing are <Mark>deleted immediately</Mark> after
          transcoding finishes. Completed MP3s are temporary: they expire automatically — after
          about 30 minutes under the default configuration — and a scheduled cleanup task
          removes expired files and their job records. Cancelling a conversion deletes its
          working files right away. Recently completed results may sit briefly in a bounded
          on-disk cache so repeat conversions finish faster; cache entries are size-limited and
          age out automatically.
        </p>
      </div>
      <DeletedTable />
    </section>
  );
}

function DeletedTable() {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.25);
  const rows = [
    { d: "Source files", u: "Yes", l: "Temporary", keep: false },
    { d: "MP3 files", u: "Yes", l: "Temporary · ~30 min", keep: false },
    { d: "Conversion job data", u: "Yes", l: "Temporary", keep: false },
    { d: "Account data", u: "—", l: "Doesn't exist", keep: true },
    { d: "Advertising profile", u: "—", l: "Not used", keep: true },
  ];
  return (
    <div ref={ref} className="pv-tablewrap">
      <h3 className="pv-block-h">What gets deleted?</h3>
      <table className="pv-table">
        <caption className="pv-sr">Which data is used and how long it lives</caption>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Used?</th>
            <th scope="col">Lifetime</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.d}
              className={inView ? "is-in" : ""}
              style={{ ["--i" as string]: i } as CSSProperties}
            >
              <th scope="row">{r.d}</th>
              <td>
                {r.keep ? (
                  <span className="pv-no">—</span>
                ) : (
                  <span className="pv-yes" aria-label="yes">
                    ✓
                  </span>
                )}
              </td>
              <td>
                <span className={r.keep ? "pv-pill is-calm" : "pv-pill"}>{r.l}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* No account moment — fake login morphs into NOTHING TO KEEP          */
/* ------------------------------------------------------------------ */

function NoAccount() {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.5);
  const [morphed, setMorphed] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!inView || reduced) {
      if (reduced && inView) setMorphed(true);
      return;
    }
    const id = window.setTimeout(() => setMorphed(true), 1400);
    return () => window.clearTimeout(id);
  }, [inView, reduced]);
  return (
    <div ref={ref} className="pv-noacct">
      <h3 className="pv-block-h pv-center">No account. No account database.</h3>
      <div className={morphed ? "pv-login is-morphed" : "pv-login"} aria-live="polite">
        {!morphed ? (
          <div className="pv-fakeform" aria-hidden="true">
            <span className="pv-fakefield">Email</span>
            <span className="pv-fakefield">Password</span>
            <span className="pv-fakebtn">Login</span>
          </div>
        ) : (
          <p className="pv-morphed">
            <span className="pv-tick" aria-hidden="true">
              ✓
            </span>{" "}
            No account required
          </p>
        )}
      </div>
      <p className="pv-center pv-muted">
        {morphed ? "There is nothing to sign into — and nothing to leak." : "Waiting… there is nothing to fill in."}
      </p>
      <p className="pv-center pv-muted">
        Kharb does not require accounts, so there is <Mark>no account data</Mark> to export or
        delete.
      </p>
      {!reduced ? (
        <button
          type="button"
          className="pv-reset"
          onClick={() => setMorphed(false)}
          onAnimationEnd={() => undefined}
        >
          Replay the moment
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Network — IP diagram + rate limiting counters                       */
/* ------------------------------------------------------------------ */

function Network() {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.35);
  const c20 = useCountUp(20, inView);
  const c10 = useCountUp(10, inView);
  return (
    <section id="network" aria-labelledby="network-h" className="pv-section">
      <PvReveal as="p" className="eyebrow text-inkmuted">
        04 · Network & logs
      </PvReveal>
      <PvReveal as="h2" id="network-h" delay={1} className="display-lg pv-h">
        Your IP address, plainly explained.
      </PvReveal>
      <PvReveal as="p" delay={2} className="pv-lead">
        This happens because the service technically requires it — not to follow you around.
      </PvReveal>
      <PvReveal delay={2} className="pv-ip">
        <div className="pv-ip-node">Your connection</div>
        <span className="pv-ip-arrow" aria-hidden="true">
          ↓
        </span>
        <div className="pv-ip-node is-ip">IP address</div>
        <span className="pv-ip-arrow" aria-hidden="true">
          ↓
        </span>
        <ul className="pv-ip-uses">
          <li>Rate limiting</li>
          <li>Abuse prevention</li>
          <li>Operational logging</li>
        </ul>
      </PvReveal>
      <div ref={ref} className="pv-limits" role="list" aria-label="Rate limits per address">
        <div className="pv-limit" role="listitem">
          <span className="pv-limit-n">~{c20}</span>
          <span className="pv-limit-l">URL analyses / minute</span>
        </div>
        <div className="pv-limit" role="listitem">
          <span className="pv-limit-n">a handful</span>
          <span className="pv-limit-l">concurrent jobs</span>
        </div>
        <div className="pv-limit" role="listitem">
          <span className="pv-limit-n">~{c10}</span>
          <span className="pv-limit-l">new conversions / hour</span>
        </div>
      </div>
      <p className="pv-muted pv-center">Actively protected against abuse — not passively collecting.</p>
      <div className="pv-policy" aria-labelledby="network-policy">
        <h3 id="network-policy" className="pv-policy-h">
          The policy, in full —{" "}
          <a href="#network" className="framer-link">
            network addresses, logs, and rate limiting
          </a>
        </h3>
        <p>
          Your IP address is necessarily processed to deliver the service: it is used for rate
          limiting (roughly 20 URL analyses per minute, a handful of concurrent jobs, and about
          10 new conversions per hour per address) and for abuse prevention. The server keeps
          operational logs for reliability and security monitoring, and IP information may
          appear in those logs and in transient job records until they expire. Logs are not sold
          and are <Mark>not used for advertising</Mark>.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Analytics + cookies — what is measured vs. what is NOT               */
/* ------------------------------------------------------------------ */

function Analytics() {
  return (
    <section id="analytics" aria-labelledby="analytics-h" className="pv-section">
      <PvReveal as="p" className="eyebrow text-inkmuted">
        05 · Analytics
      </PvReveal>
      <PvReveal as="h2" id="analytics-h" delay={1} className="display-lg pv-h">
        Measured in aggregate. Never profiled.
      </PvReveal>
      <PvReveal delay={2} className="pv-tree">
        <div className="pv-tree-root">Kharb</div>
        <ul className="pv-tree-branches" aria-label="Events measured in aggregate">
          <li>Page views</li>
          <li>Analysis attempts</li>
          <li>Successful conversions</li>
          <li>Conversion errors</li>
        </ul>
        <span className="pv-tree-arrow" aria-hidden="true">
          ↓
        </span>
        <div className="pv-tree-leaf">Google Analytics</div>
      </PvReveal>
      <div className="pv-nothave-row" aria-label="What Kharb does not use">
        <div className="pv-dont">
          <h3 className="pv-block-h">What Kharb does NOT use</h3>
          <ul>
            <li>
              <span aria-hidden="true">✕</span> Advertising profiles
            </li>
            <li>
              <span aria-hidden="true">✕</span> Cross-site tracking
            </li>
            <li>
              <span aria-hidden="true">✕</span> Social widgets
            </li>
          </ul>
        </div>
        <div className="pv-cookie">
          <h3 className="pv-block-h">Cookies</h3>
          <div className="pv-cookie-card">
            <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
              <circle cx="17" cy="17" r="14" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="12.5" cy="13.5" r="1.8" fill="currentColor" />
              <circle cx="20" cy="12" r="1.4" fill="currentColor" />
              <circle cx="22.5" cy="19" r="1.8" fill="currentColor" />
              <circle cx="15" cy="21.5" r="1.4" fill="currentColor" />
              <circle cx="17.5" cy="17" r="1.2" fill="currentColor" />
            </svg>
            <dl>
              <div>
                <dt>Purpose</dt>
                <dd>Measurement</dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>Google Analytics</dd>
              </div>
            </dl>
            {/* Illustration only — deliberately NOT a functional control. */}
            <div className="pv-toggle" aria-hidden="true">
              <span>Analytics</span>
              <span className="pv-switch is-on">
                <i />
              </span>
              <span className="pv-on">ON</span>
            </div>
            <p className="pv-toggle-note">Illustration only — manage cookies in your browser.</p>
          </div>
        </div>
      </div>
      <div className="pv-policy" aria-labelledby="analytics-policy">
        <h3 id="analytics-policy" className="pv-policy-h">
          The policy, in full —{" "}
          <a href="#analytics" className="framer-link">
            analytics, cookies, and third-party services
          </a>
        </h3>
        <p>
          The site uses Google Analytics (gtag.js) to measure aggregate usage — including page
          views and conversion interactions such as analysis attempts, successful conversions,
          and conversion errors. Google Analytics sets its own cookies and processes usage data
          on Google&apos;s servers subject to Google&apos;s policies.{" "}
          <Mark>No other advertising, cross-site tracking, or social-media widgets</Mark> are
          embedded. The site&apos;s own functionality does not require accounts and stores no
          account data, because accounts do not exist.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Processing — trust boundary + glowing pipeline                       */
/* ------------------------------------------------------------------ */

const PIPE = [
  "URL",
  "Validation",
  "Metadata",
  "Media retrieval",
  "FFmpeg",
  "MP3",
  "Delivery",
  "Cleanup",
] as const;

function Processing() {
  return (
    <section id="processing" aria-labelledby="processing-h" className="pv-section">
      <PvReveal as="p" className="eyebrow text-inkmuted">
        06 · Server processing
      </PvReveal>
      <PvReveal as="h2" id="processing-h" delay={1} className="display-lg pv-h">
        Where your data travels.
      </PvReveal>
      <PvReveal delay={2} className="pv-trust">
        <div className="pv-trust-box is-root">Kharb</div>
        <div className="pv-trust-split">
          <div className="pv-trust-col">
            <span className="pv-trust-k">Converter</span>
            <span className="pv-trust-arrow" aria-hidden="true">
              ↓
            </span>
            <span className="pv-trust-leaf">Video source servers</span>
          </div>
          <div className="pv-trust-col">
            <span className="pv-trust-k">Analytics</span>
            <span className="pv-trust-arrow" aria-hidden="true">
              ↓
            </span>
            <span className="pv-trust-leaf">Google Analytics</span>
          </div>
        </div>
        <p className="pv-trust-cap">
          Two trust boundaries: conversion work stays on Kharb&apos;s server; thumbnails load
          from the source platform; analytics data is processed by Google.
        </p>
      </PvReveal>
      <ol className="pv-pipe" aria-label="Server processing pipeline">
        {PIPE.map((s, i) => (
          <PvReveal as="li" key={s} delay={(i % 3) as 0 | 1 | 2} className="pv-pipe-step">
            <span className="pv-pipe-n">{String(i + 1).padStart(2, "0")}</span>
            <span className="pv-pipe-k">{s}</span>
            {i < PIPE.length - 1 ? (
              <span className="pv-pipe-line" aria-hidden="true">
                <i />
              </span>
            ) : null}
          </PvReveal>
        ))}
      </ol>
      <div className="pv-policy" aria-labelledby="hosting">
        <h3 id="hosting" className="pv-policy-h">
          The policy, in full —{" "}
          <a href="#hosting" className="framer-link">
            hosting and server processing
          </a>
        </h3>
        <p>
          All conversion work happens on the server that hosts this site: URL validation,
          metadata fetching, media retrieval, FFmpeg transcoding, and file delivery. Video
          thumbnails shown during analysis are loaded from the source platform&apos;s servers.
          Standard hosting realities apply — TLS termination, reverse proxies, and
          infrastructure logs outside this application&apos;s control may record connection
          metadata.
        </p>
      </div>
      <div className="pv-nothave">
        <PvReveal as="h2" delay={0} className="display-md pv-h pv-center">
          Things Kharb doesn&apos;t have.
        </PvReveal>
        <ul className="pv-nothave-grid">
          {[
            ["No accounts", "Nothing to sign into, breach, or export."],
            ["No profile", "No behaviour stitched across visits."],
            ["No advertising tracker", "No ad network, no retargeting pixel."],
            ["No social widgets", "No embedded like/share frames phoning home."],
            ["No permanent conversion files", "Every file is born with an expiry."],
          ].map(([t, d], i) => (
            <PvReveal as="li" key={t} delay={(i % 3) as 0 | 1 | 2} className="pv-nothave-card">
              <span className="pv-nothave-k">{t}</span>
              <span className="pv-nothave-d">{d}</span>
            </PvReveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Choices + contact + end of journey                                   */
/* ------------------------------------------------------------------ */

function Choices() {
  return (
    <section id="choices" aria-labelledby="choices-h" className="pv-section">
      <PvReveal as="p" className="eyebrow text-inkmuted">
        07 · Your choices
      </PvReveal>
      <PvReveal as="h2" id="choices-h" delay={1} className="display-lg pv-h">
        What can you do?
      </PvReveal>
      <ul className="pv-choice-grid">
        <PvReveal as="li" className="pv-choice">
          <span className="pv-choice-n">01</span>
          <span className="pv-choice-t">Don&apos;t finish the conversion</span>
          <span className="pv-choice-d">Working files are cancelled and deleted.</span>
        </PvReveal>
        <PvReveal as="li" delay={1} className="pv-choice">
          <span className="pv-choice-n">02</span>
          <span className="pv-choice-t">Let the result expire</span>
          <span className="pv-choice-d">Temporary completed files automatically disappear.</span>
        </PvReveal>
        <PvReveal as="li" delay={2} className="pv-choice">
          <span className="pv-choice-n">03</span>
          <span className="pv-choice-t">Contact us</span>
          <span className="pv-choice-d">Questions or concerns can be sent to the operator.</span>
        </PvReveal>
      </ul>
      <div className="pv-policy" aria-labelledby="rights">
        <h3 id="rights" className="pv-policy-h">
          The policy, in full —{" "}
          <a href="#rights" className="framer-link">
            your choices and contact
          </a>
        </h3>
        <p>
          Because there are no accounts, there is no account data to export or delete — and
          because files expire automatically, the most effective privacy control is simply
          letting conversions lapse. If you have questions about this policy or believe
          something is being retained that should not be, contact the operator at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="framer-link">
            {CONTACT_EMAIL}
          </a>
          . See also the <Link href="/terms" className="framer-link">terms of service</Link> and
          the{" "}
          <Link href="/how-to-convert-video-to-mp3" className="framer-link">
            conversion guide
          </Link>
          .
        </p>
      </div>
      <div className="pv-contact">
        <PvReveal as="h2" className="display-md pv-h pv-center">
          Still have questions?
        </PvReveal>
        <PvReveal as="p" delay={1} className="pv-muted pv-center">
          Privacy should be understandable.
        </PvReveal>
        <PvReveal delay={2} className="pv-center">
          <a href={`mailto:${CONTACT_EMAIL}`} className="pv-btn-primary">
            Contact Kharb →
          </a>
          <span className="pv-email">
            <a href={`mailto:${CONTACT_EMAIL}`} className="framer-link">
              {CONTACT_EMAIL}
            </a>
          </span>
        </PvReveal>
      </div>
      <p className="pv-updated">Privacy policy · Last updated September 2026</p>
      <div className="pv-end">
        <p className="display-md pv-h pv-center">You&apos;ve reached the end.</p>
        <p className="pv-muted pv-center">Your data doesn&apos;t stay here forever.</p>
        <p className="pv-center">
          <Link href="/" className="pv-btn-primary">
            Back to Kharb
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const SPY_IDS = TOC.map((t) => t.id);

export function PrivacyExperience() {
  const reduced = useReducedMotion();
  const active = useSpy(SPY_IDS);
  const [drawer, setDrawer] = useState(false);
  const closeDrawer = useCallback(() => setDrawer(false), []);

  return (
    <main className="pv-page">
      <div className="pv-grid" aria-hidden="true" />
      <a href="#submit" className="pv-skip">
        Skip the visuals — read the policy
      </a>

      {/* Sticky mini TOC (desktop) */}
      <nav className="pv-toc" aria-label="Privacy sections">
        <p className="pv-toc-k">Privacy</p>
        <ul>
          {TOC.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`} aria-current={active === t.id ? "true" : undefined} className={active === t.id ? "is-on" : ""}>
                <span className="pv-toc-dot" aria-hidden="true">
                  {active === t.id ? "●" : "○"}
                </span>
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Privacy meter (desktop right edge) */}
      <ol className="pv-meter" aria-label="Reading progress">
        {TOC.map((t) => (
          <li key={t.id} className={active === t.id ? "is-on" : ""} aria-current={active === t.id ? "step" : undefined}>
            <a href={`#${t.id}`} aria-label={`${t.n} ${t.label}`}>
              {t.n}
            </a>
          </li>
        ))}
      </ol>

      {/* Mobile sections drawer */}
      <div className="pv-drawerbar">
        <button
          type="button"
          className="pv-drawerbtn"
          aria-expanded={drawer}
          aria-controls="pv-sections"
          onClick={() => setDrawer((v) => !v)}
        >
          ☰ Sections · {TOC.find((t) => t.id === active)?.label ?? "Overview"}
        </button>
        {drawer ? (
          <nav id="pv-sections" className="pv-drawer" aria-label="Privacy sections">
            <ul>
              {TOC.map((t) => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    onClick={closeDrawer}
                    className={active === t.id ? "is-on" : ""}
                  >
                    <span className="pv-toc-n">{t.n}</span> {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>

      <div className="pv-col">
        <Hero reduced={reduced} />
        <Lifecycle reduced={reduced} />
        <Submit />
        <Temporary reduced={reduced} />
        <NoAccount />
        <Network />
        <Analytics />
        <Processing />
        <Choices />
      </div>
    </main>
  );
}
