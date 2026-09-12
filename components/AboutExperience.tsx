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
import { Reveal } from "@/components/Reveal";

/* ------------------------------------------------------------------ */
/* Small shared hooks (zero deps, rAF scrub, reduced-motion aware)     */
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

/** Generic tall-track scrub: 0 at track top hits viewport top, 1 at bottom. */
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

function useInView<T extends HTMLElement>(threshold = 0.3) {
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
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCountUp(target: number, run: boolean, duration = 1200) {
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
/* Data — everything stays truthful to what Kharb actually is          */
/* ------------------------------------------------------------------ */

const STORY_PHASES = [
  {
    word: "Curiosity",
    body: "It started the way most good tools start: wondering what actually happens between pasting a link and getting a file back — and deciding to find out properly.",
  },
  {
    word: "Science",
    body: "Sound is physics. Sampling, waveforms, bitrates, compression — the converter only makes sense if you respect what the audio already is before you touch it.",
  },
  {
    word: "Coding",
    body: "A Next.js site, a pluggable retrieval adapter, background jobs, and FFmpeg doing the real work — wired together with honest progress, not a fake bar.",
  },
  {
    word: "Experiments",
    body: "Encoder settings, failure modes, rate limits, private videos, long uploads. Every edge case on this site was met in testing before it met you.",
  },
  {
    word: "Building",
    body: "One narrow tool instead of a maze of doorway pages: paste a link you own or may keep, pick a quality, download. No accounts, no installs, no clutter.",
  },
  {
    word: "Kharb.online",
    body: "A small, independent, privacy-focused converter. Source files are scratch space, finished MP3s expire, and the contact page reaches the person who maintains it.",
  },
] as const;

const TIMELINE = [
  {
    phase: "Phase 01",
    title: "Curiosity",
    body: "A technical exercise in media processing: queues, background jobs, and parsing real encoder progress instead of guessing.",
  },
  {
    phase: "Phase 02",
    title: "First transcode",
    body: "Retrieval adapter plus FFmpeg. Link validation first, audio extraction second, honest statuses all the way through.",
  },
  {
    phase: "Phase 03",
    title: "Queue & honesty",
    body: "Queued → retrieving → processing → finalizing, with plain-language errors for private, deleted, or over-limit videos.",
  },
  {
    phase: "Phase 04",
    title: "Privacy hardening",
    body: "Scratch-space discipline: sources deleted at finish, MP3s expire automatically, cancelling wipes files immediately.",
  },
  {
    phase: "Phase 05",
    title: "Narrow scope",
    body: "One converter done carefully, with a step-by-step guide, an FAQ, and documented limits instead of exaggerated claims.",
  },
] as const;

const LOVES = [
  {
    title: "Physics",
    body: "Waves, sound, energy. Audio files stop being magic once you see the waveform.",
    detail: "Why bitrates and sampling exist at all.",
    tone: "violet" as const,
  },
  {
    title: "Mathematics",
    body: "Logarithms, durations, file sizes. The numbers behind every quality choice.",
    detail: "128 → 320 kbps is arithmetic with consequences.",
    tone: "plain" as const,
  },
  {
    title: "Programming",
    body: "Next.js, background jobs, adapters. The plumbing that makes paste → MP3 feel instant.",
    detail: "Real encoder progress, parsed live.",
    tone: "plain" as const,
  },
  {
    title: "Systems",
    body: "Temporary files, scheduled cleanup, rate limits. Boring infrastructure, done correctly.",
    detail: "Nothing kept. Everything expires.",
    tone: "plain" as const,
  },
  {
    title: "Experiments",
    body: "Trying settings, breaking things, documenting what actually happened.",
    detail: "Every limit on this site was measured.",
    tone: "orange" as const,
  },
  {
    title: "Technology",
    body: "Tools that respect the user: no accounts, no tracking libraries, no dark patterns.",
    detail: "One job, done carefully.",
    tone: "plain" as const,
  },
] as const;

const NODES = [
  {
    id: "physics",
    label: "Physics",
    x: 200,
    y: 52,
    depth: 16,
    blurb: "Sound before software.",
    topics: ["Waves & sampling", "Bitrate vs. detail", "Why quality caps exist"],
  },
  {
    id: "math",
    label: "Math",
    x: 72,
    y: 168,
    depth: 22,
    blurb: "Numbers behind quality.",
    topics: ["128 – 320 kbps ladder", "Durations & file sizes", "Logarithms (loudness)"],
  },
  {
    id: "code",
    label: "Programming",
    x: 328,
    y: 168,
    depth: 22,
    blurb: "Paste → MP3 plumbing.",
    topics: ["Next.js + jobs", "FFmpeg transcodes", "Honest error states"],
  },
  {
    id: "systems",
    label: "Systems",
    x: 200,
    y: 282,
    depth: 16,
    blurb: "Boring, correct infra.",
    topics: ["Temp files only", "Scheduled cleanup", "Rate limiting"],
  },
  {
    id: "lab",
    label: "Experiments",
    x: 200,
    y: 168,
    depth: 10,
    blurb: "The hub. Everything connects here.",
    topics: ["Encoder trials", "Failure-mode catalog", "Docs from real runs"],
  },
] as const;

const EDGES: Array<[number, number]> = [
  [4, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
];

const PROJECTS = [
  {
    n: "Project 01",
    title: "Kharb converter",
    body: "Paste a supported link, pick 128–320 kbps, download the MP3. No account, no software, works in a mobile browser.",
    meta: "Next.js · adapter · jobs",
    cta: { href: "/#converter", label: "Try the converter" },
  },
  {
    n: "Project 02",
    title: "Transcode pipeline",
    body: "Validation, retrieval, FFmpeg transcode, finalization — with real progress from queued to done and errors stated plainly.",
    meta: "FFmpeg · progress parsing",
    cta: { href: "/how-to-convert-video-to-mp3", label: "See how it works" },
  },
  {
    n: "Project 03",
    title: "Temporary by design",
    body: "Sources deleted the moment encoding finishes. Finished MP3s expire after about 30 minutes. Cancel wipes files now.",
    meta: "Cleanup cron · no archive",
    cta: { href: "/privacy", label: "Read the privacy policy" },
  },
] as const;

const DIVE_LAYERS = [
  {
    n: "01",
    title: "Surface",
    body: "What you see: a link field, a quality picker, a download button. Nothing else competing for attention.",
  },
  {
    n: "02",
    title: "Components",
    body: "Converter, How-it-works timeline, stacking Why cards, editorial FAQ. One dark system, shared tokens.",
  },
  {
    n: "03",
    title: "Code",
    body: "Next.js routes, a pluggable retrieval adapter, background workers, FFmpeg. Type-safe, tested, logged.",
  },
  {
    n: "04",
    title: "Systems",
    body: "Job queue, temporary storage, scheduled cleanup, rate limits. Files flow through — they never settle.",
  },
] as const;

const MORPH_WORDS = ["LEARN", "BUILD", "BREAK", "REBUILD"] as const;

const EXPLORING = [
  { title: "Audio & waves", status: "Reading", note: "Sampling, masking, perception.", pulse: true },
  { title: "Queues & jobs", status: "Testing", note: "Backpressure, retries, honesty.", pulse: true },
  { title: "Web architecture", status: "Shipping", note: "Next.js, caching, restraint.", pulse: false },
  { title: "Media encoding", status: "Testing", note: "FFmpeg flags worth keeping.", pulse: true },
  { title: "New experiments", status: "Ongoing", note: "Small trials, written up.", pulse: false },
] as const;

/* ------------------------------------------------------------------ */
/* Magnetic wrapper — subtle tilt + pull, desktop pointers only        */
/* ------------------------------------------------------------------ */

function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const onMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el || reduced) return;
      if (window.matchMedia("(hover: none)").matches) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = `perspective(900px) rotateX(${(-dy * 7).toFixed(2)}deg) rotateY(${(dx * 9).toFixed(
        2
      )}deg) translate3d(${(dx * 8).toFixed(1)}px, ${(dy * 8).toFixed(1)}px, 0)`;
    },
    [reduced]
  );
  const onLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "";
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transition: "transform 0.45s cubic-bezier(0.22,1,0.36,1)", willChange: "transform" }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function Hero({ reduced }: { reduced: boolean }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [scrollK, setScrollK] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      setScrollK(Math.min(1, window.scrollY / Math.max(1, window.innerHeight)));
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

  const onMouse = useCallback(
    (e: React.MouseEvent) => {
      if (reduced) return;
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return;
      setMouse({
        x: (e.clientX - r.left) / r.width - 0.5,
        y: (e.clientY - r.top) / r.height - 0.5,
      });
    },
    [reduced]
  );

  const fade = 1 - scrollK * 0.9;
  const scale = 1 - scrollK * 0.08;
  const rise = scrollK * 90;

  return (
    <section
      ref={rootRef}
      aria-labelledby="about-hero"
      className="ab-hero"
      onMouseMove={onMouse}
      style={
        {
          "--mx": `${50 + mouse.x * 100}%`,
          "--my": `${38 + mouse.y * 100}%`,
          "--px": `${mouse.x * 14}px`,
          "--py": `${mouse.y * 14}px`,
        } as CSSProperties
      }
    >
      <div className="ab-hero-glow" aria-hidden="true" />
      <div className="ab-orb ab-orb-a" aria-hidden="true" />
      <div className="ab-orb ab-orb-b" aria-hidden="true" />

      <div
        className="ab-hero-inner"
        style={reduced ? undefined : { opacity: fade, transform: `translateY(${-rise}px) scale(${scale})`, filter: `blur(${(scrollK * 6).toFixed(1)}px)` }}
      >
        <p className="ab-eyebrow">
          <span className="ab-live-dot" aria-hidden="true" />
          About · Kharb.online · independent project
        </p>
        <Reveal as="h1" id="about-hero" className="display-xxl ab-hero-title">
          I build. I experiment. I learn.
        </Reveal>
        <p className="body-lg ab-hero-sub">
          Kharb is a small, privacy-focused website that turns video links you own or may keep into MP3 audio — and
          keeps nothing afterwards.
        </p>
        <div className="ab-hero-ctas">
          <Link href="/#converter" className="ab-btn-primary">
            Convert a video
          </Link>
          <Link href="/how-to-convert-video-to-mp3" className="ab-btn-secondary">
            How it works
          </Link>
        </div>
        <dl className="ab-hero-meta">
          <div>
            <dt>No accounts</dt>
            <dd>nothing to breach</dd>
          </div>
          <div>
            <dt>Temp files</dt>
            <dd>auto-deleted</dd>
          </div>
          <div>
            <dt>One tool</dt>
            <dd>done carefully</dd>
          </div>
        </dl>
      </div>

      <a href="#who" className="ab-scrollcue" aria-label="Scroll to Who I am">
        <span className="ab-scrollcue-line" style={reduced ? undefined : { transform: `scaleY(${1 - scrollK})` }} aria-hidden="true" />
        <span>Scroll</span>
      </a>
    </section>
  );
}

function WhoAmI() {
  const { ref, inView } = useInView<HTMLDivElement>(0.35);
  const cQualities = useCountUp(4, inView);
  const cMinutes = useCountUp(30, inView);
  const cAccounts = useCountUp(0, inView);
  const cTools = useCountUp(1, inView);
  return (
    <section aria-labelledby="who" className="ab-section" id="who">
      <div ref={ref} className="ab-split">
        <div>
          <p className="eyebrow text-inkmuted">Who I am</p>
          <Reveal as="h2" id="who-h" className="display-xl mt-4 text-balance text-ink">
            Who is Kharb?
          </Reveal>
          <p className="subhead mt-5 max-w-xl text-inkmuted">
            An independent developer building in the open: physics for intuition, mathematics for precision, programming
            for leverage — and systems thinking to keep it all honest.
          </p>
        </div>
        <div className="ab-stats" role="list" aria-label="Kharb at a glance">
          {[
            { v: String(cQualities), label: "MP3 qualities · 128–320 kbps" },
            { v: `~${cMinutes}`, label: "minutes before MP3s expire" },
            { v: String(cAccounts), label: "accounts, profiles, libraries" },
            { v: String(cTools), label: "converter — narrow on purpose" },
          ].map((s) => (
            <div key={s.label} className="ab-stat" role="listitem">
              <span className="ab-stat-num" aria-hidden="true">
                {s.v}
              </span>
              <span className="ab-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="ab-prose-grid">
        <div className="card-charcoal ab-prose-card">
          <p className="display-md text-ink">What this website does</p>
          <p className="ab-cardbody">
            Paste a supported video link, choose an MP3 quality, download the audio. The server validates the link,
            retrieves the audio track, transcodes it with FFmpeg, and hands you a temporary download link — no account,
            nothing installed.
          </p>
        </div>
        <div className="card-charcoal ab-prose-card">
          <p className="display-md text-ink">Privacy-focused by design</p>
          <p className="ab-cardbody">
            Source files are deleted the moment transcoding finishes, finished MP3s expire automatically, and cleanup
            runs on a schedule. Rate limiting and operational logs exist to keep the service running — profiles do not.
          </p>
        </div>
      </div>
    </section>
  );
}

/** Scroll-driven story theatre: pinned giant word morphs Curiosity → … → Kharb.online */
function StoryTheatre({ reduced }: { reduced: boolean }) {
  const trackRef = useRef<HTMLElement | null>(null);
  const p = useScrub(trackRef, reduced);
  const idx = Math.min(STORY_PHASES.length - 1, Math.floor(p * STORY_PHASES.length));
  const phase = STORY_PHASES[idx];
  return (
    <section ref={trackRef} aria-labelledby="story" className={reduced ? "ab-story is-fallback" : "ab-story"}>
      <div className="ab-story-sticky">
        <div className="ab-story-inner">
          <p className="eyebrow text-inkmuted" id="story">
            My journey — a short documentary
          </p>
          <div className="ab-story-stage" aria-live="polite">
            <p className="ab-story-count">
              {String(idx + 1).padStart(2, "0")} / {String(STORY_PHASES.length).padStart(2, "0")}
            </p>
            <p key={phase.word} className="display-xl ab-story-word">
              {phase.word}
            </p>
            <p key={`${phase.word}-body`} className="ab-story-body">
              {phase.body}
            </p>
          </div>
          <div className="ab-story-progress" aria-hidden="true">
            <div className="ab-story-fill" style={{ transform: `scaleX(${reduced ? 1 : p})` }} />
          </div>
          <ol className="ab-story-dots" aria-label="Story phases">
            {STORY_PHASES.map((s, i) => (
              <li key={s.word}>
                <span className={i === idx ? "ab-story-dot is-on" : i < idx ? "ab-story-dot is-done" : "ab-story-dot"} />
                <span className="ab-sr">{s.word}</span>
              </li>
            ))}
          </ol>
          {reduced ? (
            <ol className="ab-story-fallback">
              {STORY_PHASES.map((s) => (
                <li key={s.word}>
                  <strong>{s.word}.</strong> {s.body}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Horizontal milestone timeline (sticky scrub on desktop, stacked on mobile) */
function JourneyTimeline({ reduced }: { reduced: boolean }) {
  const trackRef = useRef<HTMLElement | null>(null);
  const p = useScrub(trackRef, reduced);
  const active = Math.min(TIMELINE.length - 1, Math.floor(p * TIMELINE.length));
  const jumpTo = useCallback(
    (i: number) => {
      const el = trackRef.current;
      if (!el || reduced) return;
      const rect = el.getBoundingClientRect();
      const top = window.scrollY + rect.top;
      const total = rect.height - window.innerHeight;
      window.scrollTo({ top: top + (total * (i + 0.5)) / TIMELINE.length, behavior: "smooth" });
    },
    [reduced]
  );
  return (
    <section ref={trackRef} aria-labelledby="milestones" className={reduced ? "ab-hwrap is-fallback" : "ab-hwrap"}>
      <div className="ab-hsticky">
        <div className="ab-hinner">
          <p className="eyebrow text-inkmuted" id="milestones">
            Milestones
          </p>
          <Reveal as="h2" className="display-lg mt-4 max-w-2xl text-balance text-ink">
            A timeline that moves as you do
          </Reveal>
          <div
            className="ab-htrack"
            style={reduced ? undefined : ({ "--hp": p } as CSSProperties)}
            role="list"
            aria-label="Project milestones"
          >
            <div
              className="ab-hrail"
              aria-hidden="true"
              style={reduced ? undefined : { transform: `translateX(calc(${-p * 62}%))` }}
            >
              {TIMELINE.map((m, i) => {
                const dim = !reduced && i < active;
                return (
                  <button
                    key={m.phase}
                    type="button"
                    role="listitem"
                    onClick={() => jumpTo(i)}
                    aria-current={i === active ? "true" : undefined}
                    className={i === active ? "ab-hcard is-active" : dim ? "ab-hcard is-past" : "ab-hcard"}
                    style={{ ["--i" as string]: i } as CSSProperties}
                  >
                    <span className="ab-hphase">{m.phase}</span>
                    <span className="ab-htitle">{m.title}</span>
                    <span className="ab-hbody">{m.body}</span>
                    <span className="ab-hmore">{i === active ? "You are here" : "Jump here"}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="ab-hprogress" aria-hidden="true">
            <div className="ab-hfill" style={{ transform: `scaleX(${reduced ? 1 : p})` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ThingsILove() {
  return (
    <section aria-labelledby="loves" className="ab-section">
      <p className="eyebrow text-inkmuted" id="loves">
        Things I love
      </p>
      <Reveal as="h2" className="display-lg mt-4 max-w-2xl text-balance text-ink">
        Six ideas that keep pulling me back
      </Reveal>
      <p className="subhead mt-5 max-w-2xl text-inkmuted">
        Not a skill list — the raw material. Each one shows up somewhere inside this website.
      </p>
      <ul className="ab-love-grid">
        {LOVES.map((c, i) => (
          <li key={c.title} style={{ ["--i" as string]: i } as CSSProperties} className="ab-love-li">
            <Magnetic className={`ab-love-card tone-${c.tone}`}>
              <span className="ab-love-n">{String(i + 1).padStart(2, "0")}</span>
              <span className="ab-love-title">{c.title}</span>
              <span className="ab-love-body">{c.body}</span>
              <span className="ab-love-detail">{c.detail}</span>
            </Magnetic>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Constellation() {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [sel, setSel] = useState<(typeof NODES)[number]>(NODES[4]);
  const reduced = useReducedMotion();
  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (reduced) return;
      const r = boxRef.current?.getBoundingClientRect();
      if (!r) return;
      setMouse({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
    },
    [reduced]
  );
  const pt = useCallback(
    (n: (typeof NODES)[number]) => ({ x: n.x + mouse.x * n.depth * 2, y: n.y + mouse.y * n.depth * 2 }),
    [mouse]
  );
  return (
    <section aria-labelledby="constellation" className="ab-section">
      <p className="eyebrow text-inkmuted" id="constellation">
        Interactive skills
      </p>
      <Reveal as="h2" className="display-lg mt-4 max-w-2xl text-balance text-ink">
        A constellation, not a progress bar
      </Reveal>
      <p className="subhead mt-5 max-w-2xl text-inkmuted">
        Move your cursor — the network breathes. Select a node to see what it actually means inside Kharb.
      </p>
      <div className="ab-const-grid">
        <div ref={boxRef} className="card-charcoal ab-const-stage" onMouseMove={onMove} onMouseLeave={() => setMouse({ x: 0, y: 0 })}>
          <svg viewBox="0 0 400 334" role="group" aria-label="Skill constellation. Use the buttons below to explore each node.">
            {EDGES.map(([a, b], i) => {
              const A = pt(NODES[a]);
              const B = pt(NODES[b]);
              return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y} className="ab-edge" />;
            })}
            {NODES.map((n) => {
              const q = pt(n);
              const isSel = sel.id === n.id;
              return (
                <g key={n.id} transform={`translate(${q.x} ${q.y})`} className={isSel ? "ab-node is-sel" : "ab-node"}>
                  <circle r={isSel ? 22 : 15} className="ab-node-halo" />
                  <circle r={isSel ? 11 : 7} className="ab-node-core" />
                  <text y={30} textAnchor="middle" className="ab-node-label">
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="ab-node-btns" role="group" aria-label="Choose a skill node">
            {NODES.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSel(n)}
                aria-pressed={sel.id === n.id}
                className={sel.id === n.id ? "ab-node-btn is-on" : "ab-node-btn"}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-featured ab-const-detail" aria-live="polite" key={sel.id}>
          <p className="ab-const-kicker">{sel.blurb}</p>
          <p className="display-md text-ink">{sel.label}</p>
          <ul>
            {sel.topics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function WhatIBuild({ reduced }: { reduced: boolean }) {
  const trackRef = useRef<HTMLElement | null>(null);
  const p = useScrub(trackRef, reduced);
  const idx = Math.min(PROJECTS.length - 1, Math.floor(p * PROJECTS.length));
  const proj = PROJECTS[idx];
  return (
    <section ref={trackRef} aria-labelledby="build" className={reduced ? "ab-build is-fallback" : "ab-build"}>
      <div className="ab-build-sticky">
        <div className="ab-build-inner">
          <p className="eyebrow text-inkmuted" id="build">
            What I build
          </p>
          <div className="ab-build-stage">
            <div className="ab-build-visual" aria-hidden="true" key={`v-${idx}`}>
              <span className="ab-build-n">{proj.n}</span>
              <span className="ab-build-glyph">{["◍", "⬡", "◎"][idx]}</span>
              <span className="ab-build-meta">{proj.meta}</span>
            </div>
            <div className="ab-build-copy" aria-live="polite" key={`c-${idx}`}>
              <p className="ab-build-count">
                {String(idx + 1).padStart(2, "0")} / {String(PROJECTS.length).padStart(2, "0")}
              </p>
              <p className="display-md text-ink">{proj.title}</p>
              <p className="ab-cardbody">{proj.body}</p>
              <Link href={proj.cta.href} className="ab-btn-secondary">
                {proj.cta.label}
              </Link>
            </div>
          </div>
          <div className="ab-build-nav" role="group" aria-label="Choose a project">
            {PROJECTS.map((q, i) => (
              <button
                key={q.n}
                type="button"
                onClick={() => {
                  const el = trackRef.current;
                  if (!el || reduced) return;
                  const rect = el.getBoundingClientRect();
                  const top = window.scrollY + rect.top;
                  const total = rect.height - window.innerHeight;
                  window.scrollTo({ top: top + (total * (i + 0.5)) / PROJECTS.length, behavior: "smooth" });
                }}
                aria-pressed={i === idx}
                className={i === idx ? "ab-build-dot is-on" : "ab-build-dot"}
              >
                <span className="ab-sr">{q.title}</span>
              </button>
            ))}
          </div>
          {reduced ? (
            <ul className="ab-build-fallback">
              {PROJECTS.map((q) => (
                <li key={q.n} className="card-charcoal ab-prose-card">
                  <p className="ab-build-count">{q.n}</p>
                  <p className="display-md text-ink">{q.title}</p>
                  <p className="ab-cardbody">{q.body}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CodeToReality({ reduced }: { reduced: boolean }) {
  const trackRef = useRef<HTMLElement | null>(null);
  const p = useScrub(trackRef, reduced);
  const phase = p < 0.33 ? 0 : p < 0.66 ? 1 : 2;
  return (
    <section ref={trackRef} aria-labelledby="codereality" className={reduced ? "ab-code is-fallback" : "ab-code"}>
      <div className="ab-code-sticky">
        <div className="ab-code-inner">
          <p className="eyebrow text-inkmuted" id="codereality">
            Code → reality
          </p>
          <Reveal as="h2" className="display-lg mt-4 max-w-2xl text-balance text-ink">
            The loop that runs everything here
          </Reveal>
          <div className="ab-code-stage" aria-live="polite">
            <div className={phase === 0 ? "ab-code-pane is-on" : "ab-code-pane"} aria-hidden={phase !== 0}>
              <pre className="ab-codeblock">
                <code>{`while (curious) {\n  learn();\n  experiment();\n  build();\n}`}</code>
              </pre>
              <p className="ab-code-cap">The source: four lines, no excuses.</p>
            </div>
            <div className={phase === 1 ? "ab-code-pane is-on" : "ab-code-pane"} aria-hidden={phase !== 1}>
              <div className="ab-wire" aria-hidden="true">
                <span className="ab-wire-url">paste link →</span>
                <span className="ab-wire-quals">
                  <i className="is-on" /> 192 <i /> 320
                </span>
                <span className="ab-wire-btn">Convert</span>
              </div>
              <p className="ab-code-cap">The interface: one field, honest choices.</p>
            </div>
            <div className={phase === 2 ? "ab-code-pane is-on" : "ab-code-pane"} aria-hidden={phase !== 2}>
              <div className="spotlight spotlight-violet ab-real">
                <p className="ab-real-title">Kharb converter</p>
                <p className="ab-real-body">Temporary MP3 · expires automatically · nothing kept.</p>
                <Link href="/#converter" className="ab-btn-primary">
                  Open the real thing
                </Link>
              </div>
              <p className="ab-code-cap">The reality: code becomes a tool you can use.</p>
            </div>
          </div>
          <div className="ab-code-steps" role="group" aria-label="Transformation phase">
            {["Code", "Interface", "Reality"].map((s, i) => (
              <span key={s} className={phase === i ? "ab-code-step is-on" : phase > i ? "ab-code-step is-done" : "ab-code-step"}>
                {s}
              </span>
            ))}
          </div>
          <div className="ab-hprogress" aria-hidden="true">
            <div className="ab-hfill" style={{ transform: `scaleX(${reduced ? 1 : p})` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function BehindScreen({ reduced }: { reduced: boolean }) {
  const trackRef = useRef<HTMLElement | null>(null);
  const p = useScrub(trackRef, reduced);
  return (
    <section ref={trackRef} aria-labelledby="dive" className="ab-section ab-dive-wrap">
      <p className="eyebrow text-inkmuted" id="dive">
        Behind the screen
      </p>
      <Reveal as="h2" className="display-lg mt-4 max-w-2xl text-balance text-ink">
        Dive one layer deeper
      </Reveal>
      <p className="subhead mt-5 max-w-2xl text-inkmuted">
        Scroll — the surface peels back into components, code, and systems.
      </p>
      <ol className="ab-dive">
        {DIVE_LAYERS.map((l, i) => {
          const depth = reduced ? undefined : ({ transform: `translateY(${(p * (DIVE_LAYERS.length - 1 - i) * -46).toFixed(1)}px) scale(${(1 - p * 0.02 * i).toFixed(3)})` } as CSSProperties);
          return (
            <li key={l.n} className={i === DIVE_LAYERS.length - 1 ? "ab-dive-card is-final" : "ab-dive-card"} style={{ ["--i" as string]: i, ...depth } as CSSProperties}>
              <span className="ab-dive-n">{l.n}</span>
              <span>
                <span className="ab-dive-title">{l.title}</span>
                <span className="ab-dive-body">{l.body}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function MorphType() {
  const { ref, inView } = useInView<HTMLDivElement>(0.5);
  const [wi, setWi] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!inView || reduced) return;
    const t = window.setInterval(() => setWi((v) => (v + 1) % MORPH_WORDS.length), 1800);
    return () => window.clearInterval(t);
  }, [inView, reduced]);
  const word = reduced ? MORPH_WORDS[0] : MORPH_WORDS[wi];
  return (
    <section aria-labelledby="morph" className="ab-section ab-morph" ref={ref as React.RefObject<HTMLElement>}>
      <p className="eyebrow text-inkmuted" id="morph">
        The method, in one word at a time
      </p>
      <p className="display-xxl ab-morph-word" aria-live="polite" key={word}>
        {word.split("").map((ch, i) => (
          <span key={i} style={{ animationDelay: `${i * 45}ms` }} aria-hidden={i > 0 ? undefined : undefined}>
            {ch}
          </span>
        ))}
        <span className="ab-sr">{word}</span>
      </p>
      <p className="ab-cardbody ab-morph-cap">Learn it. Build it. Break it honestly. Rebuild it better. That loop is the whole site.</p>
    </section>
  );
}

function Exploring() {
  return (
    <section aria-labelledby="exploring" className="ab-section">
      <p className="eyebrow text-inkmuted" id="exploring">
        Currently exploring · live lab notes
      </p>
      <Reveal as="h2" className="display-lg mt-4 max-w-2xl text-balance text-ink">
        What the lab bench looks like now
      </Reveal>
      <ul className="ab-lab-grid">
        {EXPLORING.map((c) => (
          <li key={c.title} className="card-charcoal ab-lab-card">
            <span className="ab-lab-top">
              <span className={c.pulse ? "ab-lab-dot is-live" : "ab-lab-dot"} aria-hidden="true" />
              <span className="ab-lab-status">{c.status}</span>
            </span>
            <span className="ab-lab-title">{c.title}</span>
            <span className="ab-lab-note">{c.note}</span>
            <span className="ab-lab-bars" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Finale() {
  return (
    <section aria-labelledby="thanks" className="ab-finale">
      <Reveal as="h2" id="thanks" className="display-xl mx-auto max-w-3xl text-balance text-center text-ink">
        Thanks for exploring.
      </Reveal>
      <p className="body-lg mx-auto mt-5 max-w-md text-center">
        One converter, no accounts, nothing kept. If that sounds like your kind of tool — it is ready when your link
        is.
      </p>
      <div className="ab-hero-ctas ab-finale-ctas">
        <Link href="/#converter" className="ab-btn-primary">
          Convert a video now
        </Link>
        <Link href="/contact" className="ab-btn-secondary">
          Get in touch
        </Link>
      </div>
      <p className="ab-finale-links">
        Practical next steps:{" "}
        <Link href="/how-to-convert-video-to-mp3" className="framer-link">
          conversion guide
        </Link>
        {" · "}
        <Link href="/faq" className="framer-link">
          FAQ
        </Link>
        {" · "}
        <Link href="/" className="framer-link">
          back to Kharb
        </Link>
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function AboutExperience() {
  const reduced = useReducedMotion();
  return (
    <main className="ab-page">
      <Hero reduced={reduced} />
      <div className="ab-wrap">
        <WhoAmI />
      </div>
      <StoryTheatre reduced={reduced} />
      <div className="ab-wrap">
        <JourneyTimeline reduced={reduced} />
        <ThingsILove />
        <Constellation />
      </div>
      <WhatIBuild reduced={reduced} />
      <CodeToReality reduced={reduced} />
      <div className="ab-wrap">
        <BehindScreen reduced={reduced} />
        <MorphType />
        <Exploring />
        <Finale />
      </div>
    </main>
  );
}
