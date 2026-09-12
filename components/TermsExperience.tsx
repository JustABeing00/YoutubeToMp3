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
/* Zero-dep, reduced-motion-aware primitives (same language as Privacy) */
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

/** Page read progress 0 → 1 (for the hairline progress bar). */
function useReadProgress(disabled: boolean) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (disabled) return;
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const v = total <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / total));
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
  }, [disabled]);
  return p;
}

/* ------------------------------------------------------------------ */
/* Scroll reveal — number arrives first, then heading, then body        */
/* ------------------------------------------------------------------ */

function TmReveal({
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
      className={`tm-reveal${inView ? " is-in" : ""} tm-d${delay} ${className}`}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Table of contents + scroll spy                                      */
/* ------------------------------------------------------------------ */

const TOC = [
  { id: "acceptable", n: "01", label: "Acceptable Use" },
  { id: "responsibility", n: "02", label: "Your Responsibility" },
  { id: "ip", n: "03", label: "Intellectual Property" },
  { id: "limits", n: "04", label: "Service Limitations" },
  { id: "abuse", n: "05", label: "Prohibited Abuse" },
  { id: "liability", n: "06", label: "Disclaimer" },
  { id: "contact", n: "07", label: "Questions" },
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
/* Chapter head — 01 / KICKER / Title / human lead / thin rule         */
/* ------------------------------------------------------------------ */

function ChapterHead({
  n,
  kicker,
  title,
  lead,
  id,
}: {
  n: string;
  kicker: string;
  title: ReactNode;
  lead: ReactNode;
  id: string;
}) {
  return (
    <div className="tm-chead">
      <TmReveal as="p" className="tm-num" delay={0}>
        <span aria-hidden="true">{n}</span>
        <span className="tm-sr">Chapter {n}.</span>
      </TmReveal>
      <TmReveal as="p" delay={0} className="eyebrow text-inkmuted tm-kicker">
        {kicker}
      </TmReveal>
      <TmReveal as="h2" id={id} delay={1} className="display-lg tm-title">
        {title}
      </TmReveal>
      <TmReveal as="p" delay={2} className="tm-lead">
        {lead}
      </TmReveal>
      <TmReveal delay={2} className="tm-rule" aria-hidden="true">
        <span />
      </TmReveal>
    </div>
  );
}

/** Full legal text — always readable, selectable, linkable. */
function Policy({ labelledBy, anchor, anchorLabel, children }: { labelledBy: string; anchor: string; anchorLabel: string; children: ReactNode }) {
  return (
    <div className="tm-policy" aria-labelledby={labelledBy}>
      <h3 id={labelledBy} className="tm-policy-h">
        The terms, in full —{" "}
        <a href={anchor} className="framer-link">
          {anchorLabel}
        </a>
      </h3>
      <div className="tm-policy-body">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HERO — cinematic staged entrance                                    */
/* ------------------------------------------------------------------ */

function Hero({ reduced }: { reduced: boolean }) {
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
    <section aria-labelledby="tm-hero" className="tm-hero">
      <div className="tm-hero-glow" aria-hidden="true" />
      <div
        className="tm-hero-inner"
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
        <p className="tm-eyebrow tm-h-eyebrow">
          <span className="tm-live-dot" aria-hidden="true" />
          Terms · kharb.online · fair use
        </p>
        <h1 id="tm-hero" className="tm-hero-title">
          <span className="tm-line tm-t1">TERMS</span>
          <span className="tm-line tm-t2">OF SERVICE</span>
        </h1>
        <div className="tm-hero-rule" aria-hidden="true">
          <span />
        </div>
        <p className="tm-hero-sub">A few simple rules for using Kharb.</p>
        <p className="tm-hero-note">Clear rules. Fair use. No surprises.</p>

        <dl className="tm-status" aria-label="Legal status">
          <div className="tm-status-cell tm-s1">
            <dt>Last Updated</dt>
            <dd>September 2026</dd>
          </div>
          <div className="tm-status-cell tm-s2">
            <dt>Applies To</dt>
            <dd>Kharb</dd>
          </div>
          <div className="tm-status-cell tm-s3">
            <dt>Reading Time</dt>
            <dd>~3 min</dd>
          </div>
        </dl>

        <div className="tm-hero-ctas">
          <a href="#acceptable" className="tm-btn-primary">
            Start reading
          </a>
          <a href="#responsibility" className="tm-btn-secondary">
            Your responsibility
          </a>
        </div>
      </div>
      <a href="#acceptable" className="tm-scrollcue" aria-label="Scroll to the terms">
        <span className="tm-scrollcue-line" aria-hidden="true" />
        <span>Scroll</span>
      </a>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 01 — Acceptable use + Allowed vs Not Allowed                        */
/* ------------------------------------------------------------------ */

const ALLOWED = ["Content you own", "Content you have permission to download", "Lawful personal use"] as const;
const DENIED = [
  "Copyright infringement",
  "Paywall circumvention",
  "Access-control bypass",
  "Violating platform terms",
] as const;

function AllowedVsNot() {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className={inView ? "tm-allow is-in" : "tm-allow"}>
      <div className="tm-allow-card is-ok" style={{ ["--i" as string]: 0 } as CSSProperties}>
        <p className="tm-allow-k">
          <span className="tm-allow-ico" aria-hidden="true">
            ✓
          </span>{" "}
          You can
        </p>
        <ul>
          {ALLOWED.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>
      <div className="tm-allow-card is-no" style={{ ["--i" as string]: 1 } as CSSProperties}>
        <p className="tm-allow-k">
          <span className="tm-allow-ico" aria-hidden="true">
            ✕
          </span>{" "}
          You can&apos;t
        </p>
        <ul>
          {DENIED.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Acceptable() {
  return (
    <section aria-labelledby="acceptable" className="tm-section">
      <ChapterHead
        n="01"
        kicker="01 · Acceptable use"
        id="acceptable"
        title={
          <>
            Use Kharb for content
            <br />
            you&apos;re allowed to download.
          </>
        }
        lead="Lawful purposes only. If you own it — or you have explicit permission to keep a copy — you can convert it."
      />
      <AllowedVsNot />
      <Policy labelledBy="acceptable-policy" anchor="#acceptable" anchorLabel="acceptable use">
        <p>
          Kharb provides a video-to-MP3 conversion tool for lawful purposes. You may use it to
          convert material you own or have explicit permission to download. You must not use the
          service to infringe copyright or other intellectual-property rights, to violate any
          platform&apos;s terms of service, or to circumvent access controls, paywalls, or
          technical protection measures.
        </p>
      </Policy>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Giant full-width statements — visual anchors                        */
/* ------------------------------------------------------------------ */

function Giant({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "blue" }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.4);
  return (
    <div ref={ref} className={inView ? `tm-giantwrap is-in tone-${tone}` : `tm-giantwrap tone-${tone}`}>
      <p className="tm-giant display-xl">{children}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 02 — Your responsibility: interactive 4-step check                  */
/* ------------------------------------------------------------------ */

const CHECKS = [
  { n: "01", t: "Do I have the rights?", d: "Ownership or an explicit permission to download." },
  { n: "02", t: "Am I allowed to download it?", d: "Not rented, not borrowed, not paywalled." },
  { n: "03", t: "Does this comply with the source platform?", d: "Its terms still apply to the source." },
  { n: "04", t: "Does this comply with local law?", d: "The law where you live decides." },
] as const;

function Checks() {
  const { ref, inView } = useInViewOnce<HTMLOListElement>(0.25);
  const [done, setDone] = useState<boolean[]>([false, false, false, false]);
  const toggle = (i: number) =>
    setDone((prev) => prev.map((v, j) => (j === i ? !v : v)));
  const count = done.filter(Boolean).length;
  return (
    <div className="tm-checks">
      <p className="tm-checks-h">Before you convert — run the check:</p>
      <ol ref={ref} className={inView ? "tm-steps is-in" : "tm-steps"}>
        {CHECKS.map((s, i) => (
          <li
            key={s.n}
            className={`tm-step${done[i] ? " is-done" : ""}`}
            style={{ ["--i" as string]: i } as CSSProperties}
          >
            <button
              type="button"
              className="tm-step-btn"
              aria-pressed={done[i]}
              onClick={() => toggle(i)}
            >
              <span className="tm-step-box" aria-hidden="true">
                {done[i] ? "✓" : s.n}
              </span>
              <span className="tm-step-text">
                <span className="tm-step-t">{s.t}</span>
                <span className="tm-step-d">{s.d}</span>
              </span>
              <span className="tm-step-state" aria-hidden="true">
                {done[i] ? "Checked" : "Tap to check"}
              </span>
            </button>
            {i < CHECKS.length - 1 ? (
              <span className="tm-step-link" aria-hidden="true">
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="tm-checks-count" aria-live="polite">
        {count === 4 ? "All four check out — proceed." : `${count} / 4 checked`}
      </p>
    </div>
  );
}

function Responsibility() {
  return (
    <section aria-labelledby="responsibility" className="tm-section">
      <ChapterHead
        n="02"
        kicker="02 · Your responsibility"
        id="responsibility"
        title={
          <>
            You submit it.
            <br />
            You own the decision.
          </>
        }
        lead="Kharb converts what you point it at. The judgment call — rights, permission, platform rules, law — is yours."
      />
      <Giant>You are responsible for what you submit.</Giant>
      <Checks />
      <div className="tm-dontconvert">
        <TmReveal as="p" className="tm-dont-kicker eyebrow text-inkmuted">
          Not sure?
        </TmReveal>
        <TmReveal as="p" delay={1} className="display-lg tm-dont-big">
          Don&apos;t convert it.
        </TmReveal>
      </div>
      <Policy labelledBy="responsibility-policy" anchor="#responsibility" anchorLabel="your responsibility">
        <p>
          You are solely responsible for the URLs you submit and the files you download. Before
          converting, confirm that you hold the necessary rights or permission and that your use
          complies with the source platform&apos;s terms and the law where you live. If you are
          unsure whether you may keep a copy of something, do not convert it.
        </p>
      </Policy>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 03 — Intellectual property                                          */
/* ------------------------------------------------------------------ */

function IntellectualProperty() {
  return (
    <section aria-labelledby="ip" className="tm-section">
      <ChapterHead
        n="03"
        kicker="03 · Intellectual property"
        id="ip"
        title="Converting doesn't make it yours."
        lead="No ownership moves. No license appears. The source's rights travel with the audio."
      />
      <Giant>Ownership doesn&apos;t transfer.</Giant>
      <ul className="tm-ipgrid">
        {[
          ["No transfer", "Converting a video does not transfer ownership to you."],
          ["No license", "Nothing here licenses the underlying work to you."],
          ["No laundering", "An infringing use stays infringing after conversion."],
        ].map(([t, d], i) => (
          <TmReveal as="li" key={t} delay={(i % 3) as 0 | 1 | 2} className="tm-ipcard">
            <span className="tm-ip-n">{String(i + 1).padStart(2, "0")}</span>
            <span className="tm-ip-t">{t}</span>
            <span className="tm-ip-d">{d}</span>
          </TmReveal>
        ))}
      </ul>
      <Policy labelledBy="ip-policy" anchor="#ip" anchorLabel="intellectual property">
        <p>
          The service does not grant you any rights in third-party content. Converting a video
          does not transfer ownership, license the underlying work to you, or make an infringing
          use lawful. Audio you obtain through Kharb remains subject to whatever rights and
          restrictions applied to the source.
        </p>
      </Policy>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 04 — Service limitations: dashboard + file lifecycle                */
/* ------------------------------------------------------------------ */

const DASH = [
  ["Availability", "BEST EFFORT"],
  ["Speed", "VARIABLE"],
  ["Success", "NOT GUARANTEED"],
  ["Output quality", "VARIABLE"],
  ["Files", "TEMPORARY"],
  ["Limits", "DYNAMIC"],
] as const;

function Dashboard() {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className={inView ? "tm-dash is-in" : "tm-dash"}>
      <p className="tm-dash-h">
        <span className="tm-live-dot" aria-hidden="true" />
        Service status
      </p>
      <dl className="tm-dash-rows">
        {DASH.map(([k, v], i) => (
          <div key={k} className="tm-dash-row" style={{ ["--i" as string]: i } as CSSProperties}>
            <dt>{k}</dt>
            <dd aria-label={`${k}: ${v}`}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const LIFE = ["SOURCE", "PROCESSING", "MP3 READY", "EXPIRED", "GONE"] as const;

function FileLife() {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.35);
  return (
    <div ref={ref} className={inView ? "tm-life is-in" : "tm-life"}>
      <p className="tm-life-h">A file&apos;s lifecycle on Kharb</p>
      <ol className="tm-life-nodes" aria-label="Temporary file lifecycle">
        {LIFE.map((s, i) => (
          <li key={s} className="tm-life-node" style={{ ["--i" as string]: i } as CSSProperties}>
            <span className="tm-life-k">{s}</span>
            {i < LIFE.length - 1 ? (
              <span className="tm-life-arrow" aria-hidden="true">
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="tm-life-cap">Source files delete after transcoding. Finished MP3s expire automatically — and expired files cannot be recovered.</p>
    </div>
  );
}

function Limits() {
  return (
    <section aria-labelledby="limits" className="tm-section">
      <ChapterHead
        n="04"
        kicker="04 · Service limitations"
        id="limits"
        title={
          <>
            Best effort.
            <br />
            Temporary everything.
          </>
        }
        lead="No guarantees on availability, speed, success, or quality. Upstream platforms can throttle or block retrieval at any time."
      />
      <Dashboard />
      <FileLife />
      <Giant>The service may change.</Giant>
      <Policy labelledBy="limits-policy" anchor="#limits" anchorLabel="service limitations">
        <p>
          Conversion is provided on a best-effort basis with no guarantees of availability,
          speed, success, or output quality. Processing is temporary: source files are deleted
          after transcoding, finished MP3s expire automatically, and expired files cannot be
          recovered. The service enforces duration, size, concurrency, and rate limits that may
          change as needed, and upstream platforms may throttle or block retrieval at any time.
          Features may be modified, limited, or discontinued without notice.
        </p>
      </Policy>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 05 — Prohibited abuse: dramatic dark block                          */
/* ------------------------------------------------------------------ */

const ABUSE_LINES = [
  "NO BULK AUTOMATION",
  "NO RATE-LIMIT EVASION",
  "NO SSRF PROBING",
  "NO PATH TRAVERSAL",
  "NO MALICIOUS URLS",
  "NO SERVICE DEGRADATION",
] as const;

function Abuse() {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.25);
  return (
    <section aria-labelledby="abuse" className="tm-section">
      <ChapterHead
        n="05"
        kicker="05 · Prohibited abuse"
        id="abuse"
        title="Automation ends where abuse begins."
        lead="Use the converter like a person. Anything that probes, evades, floods, or degrades the system is out."
      />
      <div ref={ref} className={inView ? "tm-abuse is-in" : "tm-abuse"}>
        <div className="tm-abuse-grid" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <i key={i} style={{ ["--i" as string]: i } as CSSProperties} />
          ))}
        </div>
        <p className="tm-abuse-kicker">System protection · enforced</p>
        <p className="tm-abuse-title display-lg">DON&apos;T BREAK THE SYSTEM</p>
        <ul className="tm-abuse-list">
          {ABUSE_LINES.map((line, i) => (
            <li key={line} style={{ ["--i" as string]: i } as CSSProperties}>
              <span className="tm-abuse-no" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              {line}
            </li>
          ))}
        </ul>
        <p className="tm-abuse-foot">Abusive traffic may be rate-limited, blocked, or logged for security review.</p>
      </div>
      <Policy labelledBy="abuse-policy" anchor="#abuse" anchorLabel="prohibited abuse">
        <p>
          You must not abuse the service: no automated bulk submission, no attempts to evade rate
          limits or access controls, no submission of malicious URLs, no probing for server-side
          request forgery or path traversal, and no activity that degrades the service for
          others. Abusive traffic may be rate-limited, blocked, or logged for security review.
        </p>
      </Policy>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 06 — Disclaimer: deliberately quiet                                 */
/* ------------------------------------------------------------------ */

function Disclaimer() {
  return (
    <section aria-labelledby="liability" className="tm-section tm-calm">
      <ChapterHead
        n="06"
        kicker="06 · Disclaimer"
        id="liability"
        title="As is. Plainly stated."
        lead="The serious part, kept quiet on purpose — clean type, no spectacle, so the words win."
      />
      <div className="tm-quiet">
        <TmReveal as="p" delay={1} className="tm-quiet-body">
          To the maximum extent permitted by law, the service is provided “as is” without
          warranties of any kind, and the operator is not liable for indirect, incidental, or
          consequential damages arising from your use of the service — including lost files,
          failed conversions, or reliance on temporary download links. Your sole remedy for
          dissatisfaction is to stop using the site.
        </TmReveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 07 — Questions + "You made it" ending                               */
/* ------------------------------------------------------------------ */

function Questions() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    const text = CONTACT_EMAIL;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch {
        /* clipboard blocked — mailto still works */
      }
      ta.remove();
    }
    window.setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <section aria-labelledby="contact" className="tm-section">
      <ChapterHead
        n="07"
        kicker="07 · Questions"
        id="contact"
        title="That's everything."
        lead="Use Kharb responsibly. Respect creators. Respect the rules."
      />
      <div className="tm-contact">
        <TmReveal as="p" className="tm-contact-h eyebrow text-inkmuted">
          Have a question?
        </TmReveal>
        <TmReveal as="p" delay={1} className="display-md tm-contact-t">
          Contact Kharb — a human reads it.
        </TmReveal>
        <TmReveal delay={2} className="tm-contact-actions">
          <a href={`mailto:${CONTACT_EMAIL}`} className="tm-btn-primary tm-big">
            Contact Kharb <span aria-hidden="true">→</span>
          </a>
          <button type="button" onClick={copy} className="tm-ghost" aria-live="polite">
            {copied ? "Copied ✓" : CONTACT_EMAIL}
          </button>
        </TmReveal>
        <TmReveal delay={2} className="tm-contact-links">
          <Link href="/privacy" className="tm-link">
            Privacy <span aria-hidden="true">→</span>
          </Link>
          <Link href="/faq" className="tm-link">
            FAQ <span aria-hidden="true">→</span>
          </Link>
          <Link href="/how-to-convert-video-to-mp3" className="tm-link">
            How to Convert <span aria-hidden="true">→</span>
          </Link>
        </TmReveal>
        <p className="tm-updated">Terms of Service · Last updated September 2026</p>
      </div>

      <div className="tm-finale">
        <p className="tm-finale-giant" aria-hidden="true">
          K H A R B
        </p>
        <p className="tm-finale-sub">Kharb — convert only content you own or have permission to download.</p>
        <p className="tm-finale-links">
          <Link href="/" className="tm-back">
            <span aria-hidden="true">←</span> Back to the Kharb converter
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

export function TermsExperience() {
  const reduced = useReducedMotion();
  const active = useSpy(SPY_IDS);
  const progress = useReadProgress(reduced);
  const [drawer, setDrawer] = useState(false);
  const closeDrawer = useCallback(() => setDrawer(false), []);

  return (
    <main className="tm-page">
      <div className="tm-grid" aria-hidden="true" />
      {!reduced ? (
        <div className="tm-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
      ) : null}
      <a href="#acceptable" className="tm-skip">
        Skip the visuals — read the terms
      </a>

      {/* Sticky mini TOC (desktop) */}
      <nav className="tm-toc" aria-label="Terms sections">
        <p className="tm-toc-k">On this page</p>
        <ul>
          {TOC.map((t) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                aria-current={active === t.id ? "true" : undefined}
                className={active === t.id ? "is-on" : ""}
              >
                <span className="tm-toc-n" aria-hidden="true">
                  {t.n}
                </span>
                {t.label}
                <span className="tm-toc-bar" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Reading meter (desktop right edge) */}
      <ol className="tm-meter" aria-label="Reading progress">
        {TOC.map((t) => (
          <li key={t.id} className={active === t.id ? "is-on" : ""} aria-current={active === t.id ? "step" : undefined}>
            <a href={`#${t.id}`} aria-label={`${t.n} ${t.label}`}>
              {t.n}
            </a>
          </li>
        ))}
      </ol>

      {/* Mobile sections drawer */}
      <div className="tm-drawerbar">
        <button
          type="button"
          className="tm-drawerbtn"
          aria-expanded={drawer}
          aria-controls="tm-sections"
          onClick={() => setDrawer((v) => !v)}
        >
          Jump to section ↓ · {TOC.find((t) => t.id === active)?.label ?? "Acceptable Use"}
        </button>
        {drawer ? (
          <nav id="tm-sections" className="tm-drawer" aria-label="Terms sections">
            <ul>
              {TOC.map((t) => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    onClick={closeDrawer}
                    className={active === t.id ? "is-on" : ""}
                  >
                    <span className="tm-toc-n">{t.n}</span> {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>

      <div className="tm-col">
        <Hero reduced={reduced} />
        <Acceptable />
        <Giant>Use Kharb only when you&apos;re allowed to.</Giant>
        <Responsibility />
        <IntellectualProperty />
        <Limits />
        <Abuse />
        <Disclaimer />
        <Questions />
      </div>
    </main>
  );
}
