"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { CONTACT_EMAIL } from "@/lib/seo";

/* ------------------------------------------------------------------ */
/* Zero-dep helpers (same philosophy as AboutExperience: rAF + CSS)    */
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

/** 0→1 as a tall track scrolls through the viewport. */
function useScrub(trackRef: React.RefObject<HTMLElement | null>, disabled: boolean) {
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
      { threshold, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ------------------------------------------------------------------ */
/* Truthful sending: this site has no inbox API, so the form composes  */
/* a mailto handoff. Statuses describe LOCAL state only — never fake   */
/* a server delivery.                                                  */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_MSG = 1000;

const TOPICS = [
  { id: "project", label: "Project", glyph: "⬡", hint: "Blocks assemble.", color: "#6a4cf5" },
  { id: "collaboration", label: "Collaboration", glyph: "◍", hint: "Orbits link up.", color: "#0099ff" },
  { id: "question", label: "Question", glyph: "?", hint: "Question marks drift.", color: "#ffffff" },
  { id: "experiment", label: "Experiment", glyph: "✳", hint: "Particles get excited.", color: "#d44df0" },
  { id: "website", label: "Website", glyph: "▦", hint: "A grid flickers on.", color: "#999999" },
  { id: "weird", label: "Something Weird", glyph: "◐", hint: "Expect the unexpected.", color: "#ff7a3d" },
  { id: "other", label: "Other", glyph: "·", hint: "Uncategorized, welcome.", color: "#8a8a8a" },
] as const;

type TopicId = (typeof TOPICS)[number]["id"];

const SYS_LINES = [
  "Communication initialized.",
  "Curiosity detected.",
  "Waiting for input...",
  "Signal path clear.",
  "Connection remains open.",
] as const;

function topicLabel(id: TopicId | null) {
  return TOPICS.find((t) => t.id === id)?.label ?? "Hello";
}

function buildMailto(name: string, email: string, topic: TopicId | null, message: string) {
  const subject = `[kharb.online] ${topicLabel(topic)} — from ${name.trim() || "a visitor"}`;
  const body = `${message.trim()}\n\n— ${name.trim()} (${email.trim()})\nTopic: ${topicLabel(topic)}\nPage: /contact`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildCopyText(name: string, email: string, topic: TopicId | null, message: string) {
  return `To: ${CONTACT_EMAIL}\nSubject: [kharb.online] ${topicLabel(topic)} — from ${name.trim() || "a visitor"}\n\n${message.trim()}\n\n— ${name.trim()} (${email.trim()})`;
}

/* ------------------------------------------------------------------ */
/* Magnetic wrapper — 2–6px pull, desktop pointers only                */
/* ------------------------------------------------------------------ */

function Magnetic({ children, className, strength = 5 }: { children: ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia("(hover: none)").matches) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = `translate3d(${(dx * strength).toFixed(1)}px, ${(dy * strength).toFixed(1)}px, 0)`;
    },
    [strength]
  );
  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = "";
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)", willChange: "transform" }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rolling number for the message counter (342 → 343 rolls vertically) */
/* ------------------------------------------------------------------ */

function RolledNumber({ value }: { value: number }) {
  const digits = String(value).split("");
  return (
    <span className="ct-roll" aria-hidden="true">
      {digits.map((d, i) => (
        <span key={i} className="ct-roll-digit">
          <span className="ct-roll-strip" style={{ transform: `translateY(-${Number(d) * 1.2}em)` }}>
            {"0123456789".split("").map((n) => (
              <span key={n} className="ct-roll-n">
                {n}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* HERO — LET'S TALK.                                                  */
/* ------------------------------------------------------------------ */

const LETS = ["L", "E", "T", "’", "S"];
const TALK = ["T", "A", "L", "K"];

function Hero({ onStart, reduced }: { onStart: () => void; reduced: boolean }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [scrollK, setScrollK] = useState(0);
  const [vel, setVel] = useState(0);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let ticking = false;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let v = 0;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const t = performance.now();
      const dt = Math.max(1, t - lastT);
      const inst = Math.min(1, Math.abs(y - lastY) / (dt * 2.2));
      v = v * 0.88 + inst * 0.12;
      lastY = y;
      lastT = t;
      setVel(v);
      setScrollK(Math.min(1, y / Math.max(1, window.innerHeight)));
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
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      setMouse({ x: nx, y: ny });
      setCoords({ x: Math.round(e.clientX), y: Math.round(e.clientY) });
    },
    [reduced]
  );

  const fade = 1 - scrollK * 0.85;
  const rise = scrollK * 110;

  return (
    <section
      ref={rootRef}
      aria-labelledby="ct-hero"
      className="ct-hero"
      onMouseMove={onMouse}
      style={
        {
          "--mx": `${50 + mouse.x * 100}%`,
          "--my": `${36 + mouse.y * 100}%`,
          "--px": `${mouse.x * 16}px`,
          "--py": `${mouse.y * 16}px`,
        } as CSSProperties
      }
    >
      <canvas className="ct-signal-canvas" data-signal-canvas aria-hidden="true" />
      <div className="ct-hero-glow" aria-hidden="true" />
      <div className="ct-orb ct-orb-a" aria-hidden="true" />
      <div className="ct-orb ct-orb-b" aria-hidden="true" />

      <div
        className="ct-hero-inner"
        style={
          reduced
            ? undefined
            : {
                opacity: fade,
                transform: `translate3d(0, ${-rise}px, 0) skewX(${(vel * 6).toFixed(2)}deg)`,
                filter: `blur(${(scrollK * 7).toFixed(1)}px)`,
              }
        }
      >
        <p className="ct-sysline">
          <span className="ct-live-dot" aria-hidden="true" />
          kharb.online / contact — signal page
          <span className="ct-coords" aria-hidden="true">
            {String(coords.x).padStart(4, "0")} · {String(coords.y).padStart(4, "0")}
          </span>
        </p>

        <h1 id="ct-hero" className="ct-giant">
          <span className="ct-sr">Let&apos;s talk.</span>
          <span className="ct-line" aria-hidden="true">
            {LETS.map((ch, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="ct-ch ct-ch-in"
                style={
                  {
                    "--i": i,
                    "--dx": `${(mouse.x * (10 + i * 3)).toFixed(1)}px`,
                    "--dy": `${(mouse.y * (8 + i * 2)).toFixed(1)}px`,
                  } as CSSProperties
                }
              >
                {ch}
              </span>
            ))}
          </span>
          <span className="ct-line ct-line-talk" aria-hidden="true">
            {TALK.map((ch, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="ct-ch ct-ch-talk"
                style={
                  {
                    "--i": i + LETS.length,
                    "--dx": `${(mouse.x * (8 + i * 4)).toFixed(1)}px`,
                    "--dy": `${(mouse.y * (10 + i * 2)).toFixed(1)}px`,
                  } as CSSProperties
                }
              >
                {ch}
              </span>
            ))}
            <button
              type="button"
              className="ct-dot"
              onClick={onStart}
              aria-label="Start a conversation — jump to the contact form"
            >
              <span className="ct-dot-core" aria-hidden="true">
                .
              </span>
              <span className="ct-dot-expand" aria-hidden="true">
                Start a conversation <span className="ct-dot-arrow">→</span>
              </span>
            </button>
          </span>
        </h1>

        <p className="ct-hero-sub">
          Have an idea. A question. A crazy experiment. Something worth building?
        </p>
        <p className="ct-hero-note">
          One continuous signal: headline <span aria-hidden="true">→</span> particle <span aria-hidden="true">→</span> form.
          Scroll, and this type collapses into the place you write.
        </p>

        <div className="ct-hero-meta">
          <span>Email-based, reaches the maintainer</span>
          <span aria-hidden="true">·</span>
          <span>No accounts, nothing stored here</span>
          <span aria-hidden="true">·</span>
          <button type="button" className="ct-kbd-hint" onClick={onStart}>
            Press <kbd>Ctrl</kbd> + <kbd>K</kbd> to write
          </button>
        </div>
      </div>

      <button type="button" className="ct-scrollcue" onClick={onStart} aria-label="Scroll to the contact form">
        <span className="ct-scrollcue-line" aria-hidden="true" />
        <span>Scroll — it becomes a signal</span>
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* CONNECTION MORPH — headline → particle → form                       */
/* ------------------------------------------------------------------ */

const MORPH_WORDS = ["LET'S TALK.", "CONNECT", "SEND", "RECEIVE"] as const;

function Morph({ reduced }: { reduced: boolean }) {
  const trackRef = useRef<HTMLElement | null>(null);
  const p = useScrub(trackRef, reduced);
  const idx = Math.min(MORPH_WORDS.length - 1, Math.floor(p * MORPH_WORDS.length));
  const word = MORPH_WORDS[idx];
  return (
    <section ref={trackRef} aria-label="Connection transition" className={reduced ? "ct-morph is-fallback" : "ct-morph"}>
      <div className="ct-morph-sticky">
        <div className="ct-morph-inner">
          <p className="eyebrow text-inkmuted">The connection</p>
          <p className="ct-morph-word display-xl" aria-live="polite" key={word}>
            <span aria-hidden="true">
            {word.split("").map((ch, i) => (
              <span key={i} className="ct-morph-ch" style={{ animationDelay: `${i * 35}ms` }}>
                {ch === " " ? " " : ch}
              </span>
            ))}
            </span>
            <span className="ct-sr">{word}</span>
          </p>
          <p className="ct-morph-cap">
            {idx === 0 ? "The headline, shrinking." : idx === 1 ? "Collapsing to a single point." : idx === 2 ? "That point is travelling down." : "It lands where the form begins."}
          </p>
          <div className="ct-morph-track" aria-hidden="true">
            <div className="ct-morph-rail">
              <div
                className="ct-morph-dot"
                style={reduced ? undefined : { transform: `translateY(${(p * 120).toFixed(1)}px) scale(${(1.6 - p * 0.9).toFixed(2)})` }}
              />
              <div className="ct-morph-fill" style={{ transform: `scaleY(${reduced ? 1 : Math.max(0.02, p)})` }} />
            </div>
            <ol className="ct-morph-steps">
              {MORPH_WORDS.map((w, i) => (
                <li key={w} className={i === idx ? "is-on" : i < idx ? "is-done" : ""}>
                  <span className="ct-morph-n">{String(i + 1).padStart(2, "0")}</span> {w}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Progress story 01 WHO → 02 WHERE → 03 WHY → 04 SEND                 */
/* ------------------------------------------------------------------ */

const STEPS = [
  { n: "01", label: "WHO" },
  { n: "02", label: "WHERE" },
  { n: "03", label: "WHY" },
  { n: "04", label: "SEND" },
] as const;

function ProgressStory({ active, done }: { active: number; done: boolean[] }) {
  return (
    <ol className="ct-progress" aria-label="Form progress">
      {STEPS.map((s, i) => {
        const isDone = done[i];
        const isActive = i === active && !isDone;
        return (
          <li key={s.n} className={isDone ? "is-done" : isActive ? "is-active" : ""} aria-current={isActive ? "step" : undefined}>
            <span className="ct-progress-badge" aria-hidden="true">
              {isDone ? "✓" : s.n}
            </span>
            <span className="ct-progress-label">{s.label}</span>
            {i < STEPS.length - 1 ? (
              <span className="ct-progress-line" aria-hidden="true">
                <span className="ct-progress-fill" style={{ transform: `scaleX(${isDone ? 1 : isActive ? 0.45 : 0})` }} />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Main experience                                                     */
/* ------------------------------------------------------------------ */

type Phase = "form" | "launching" | "collapsing" | "composed";
type Status = "ready" | "attention" | "assembling" | "handoff" | "handed";

export function ContactExperience() {
  const reduced = useReducedMotion();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<TopicId | null>(null);
  const [message, setMessage] = useState("");
  const [tried, setTried] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [status, setStatus] = useState<Status>("ready");
  const [copied, setCopied] = useState(false);
  const [sysIdx, setSysIdx] = useState(0);
  const [sysNote, setSysNote] = useState<string | null>(null);
  const [helloFound, setHelloFound] = useState(false);
  const [secretFound, setSecretFound] = useState(false);
  const [shake, setShake] = useState(0);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [mouseXY, setMouseXY] = useState({ x: 50, y: 20 });
  const [finaleXY, setFinaleXY] = useState({ x: 0, y: 0 });

  const formRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const msgRef = useRef<HTMLTextAreaElement | null>(null);
  const composedRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);

  const nameOk = name.trim().length >= 2;
  const emailOk = EMAIL_RE.test(email.trim());
  const msgOk = message.trim().length >= 10 && message.length <= MAX_MSG;
  const topicOk = topic !== null;
  const allOk = nameOk && emailOk && msgOk;
  const dirty = name.trim() !== "" || email.trim() !== "" || message.trim() !== "";
  const activeStep = !nameOk ? 0 : !emailOk ? 1 : !msgOk ? 2 : 3;
  const done = [nameOk, emailOk, msgOk && topicOk, false];
  const msgLen = message.length;

  const sysLine = sysNote ?? SYS_LINES[sysIdx % SYS_LINES.length];
  const mailto = useMemo(() => buildMailto(name, email, topic, message), [name, email, topic, message]);

  /* Timers cleanup */
  useEffect(() => {
    const t = timers.current;
    return () => {
      t.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  /* Personality ticker */
  useEffect(() => {
    if (reduced || phase !== "form") return;
    const id = window.setInterval(() => {
      setSysNote(null);
      setSysIdx((v) => v + 1);
    }, 9000);
    return () => window.clearInterval(id);
  }, [reduced, phase]);

  /* Ctrl+K focuses the form */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        scrollToForm();
        window.setTimeout(() => {
          const target = !nameOk ? nameRef.current : !emailOk ? emailRef.current : msgRef.current;
          target?.focus({ preventScroll: true });
        }, 450);
        setSysNote("Shortcut received. Writing mode.");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameOk, emailOk]);

  /* "hello" easter egg */
  useEffect(() => {
    if (!helloFound && message.toLowerCase().includes("hello")) {
      setHelloFound(true);
      setSysNote("Greeting detected. Hello back — messy drafts welcome.");
      burst("experiment");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, helloFound]);

  /* Logo ×5 easter egg — the header logo is outside this component */
  useEffect(() => {
    let clicks = 0;
    let reset = 0;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('a[aria-label="Kharb home"]')) {
        clicks += 1;
        window.clearTimeout(reset);
        reset = window.setTimeout(() => (clicks = 0), 4000);
        if (clicks === 5) {
          clicks = 0;
          setSecretFound(true);
          setSysNote("You found something. The K remembers.");
          burst("weird");
        }
      }
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      window.clearTimeout(reset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Honest leave guard: browser-level + in-app gentle dialog for portals */
  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty && phase === "form") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty, phase]);

  /* Signal canvas: drifting particles + cursor links + topic bursts */
  useEffect(() => {
    if (reduced) return;
    const canvas = document.querySelector<HTMLCanvasElement>("[data-signal-canvas]");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const mouse = { x: -9999, y: -9999, active: false };
    interface P {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      hue: string;
      life: number;
    }
    let parts: P[] = [];
    const BURSTS: { x: number; y: number; color: string; n: number }[] = [];
    const onBurst = (e: Event) => {
      const d = (e as CustomEvent).detail as { color?: string } | undefined;
      BURSTS.push({ x: w * (0.3 + Math.random() * 0.4), y: h * (0.3 + Math.random() * 0.4), color: d?.color ?? "#ffffff", n: 26 });
    };
    window.addEventListener("ct:burst", onBurst);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = r.width;
      h = r.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = w < 640 ? 22 : 46;
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 0.8 + Math.random() * 1.6,
        hue: "255,255,255",
        life: 1,
      }));
    };
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
      mouse.x = -9999;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", onLeave);

    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      for (const b of BURSTS.splice(0)) {
        for (let i = 0; i < b.n; i++) {
          const a = Math.random() * Math.PI * 2;
          const s = 0.8 + Math.random() * 2.4;
          parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 1 + Math.random() * 1.8, hue: b.color, life: 1 });
        }
      }
      if (parts.length > 140) parts = parts.slice(-140);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        const tw = 0.35 + 0.3 * Math.sin(performance.now() / 900 + p.x);
        ctx.fillStyle = p.hue.startsWith("#")
          ? p.hue
          : `rgba(${p.hue},${Math.max(0.08, tw).toFixed(3)})`;
        if (p.hue.startsWith("#")) {
          ctx.globalAlpha = 0.8;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      /* cursor links */
      if (mouse.active) {
        ctx.lineWidth = 1;
        for (const p of parts) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 150 * 150) {
            const a = (1 - Math.sqrt(d2) / 150) * 0.3;
            ctx.strokeStyle = `rgba(0,153,255,${a.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("ct:burst", onBurst);
    };
  }, [reduced]);

  /* Finale dot follows cursor gently */
  const onFinaleMove = useCallback(
    (e: React.MouseEvent) => {
      if (reduced) return;
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setFinaleXY({
        x: ((e.clientX - r.left) / r.width - 0.5) * 22,
        y: ((e.clientY - r.top) / r.height - 0.5) * 22,
      });
    },
    [reduced]
  );

  function burst(kind: string) {
    const t = TOPICS.find((x) => x.id === kind);
    window.dispatchEvent(new CustomEvent("ct:burst", { detail: { color: t?.color ?? "#ffffff" } }));
  }

  function scrollToForm() {
    document.getElementById("signal-form")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  function pickTopic(id: TopicId) {
    setTopic((prev) => (prev === id ? null : id));
    const t = TOPICS.find((x) => x.id === id);
    if (t) {
      burst(id);
      setSysNote(`${t.label}: ${t.hint}`);
    }
  }

  function handleSend() {
    setTried(true);
    if (!allOk) {
      setStatus("attention");
      setShake((v) => v + 1);
      setSysNote("Almost a signal — one field still needs attention.");
      const target = !nameOk ? nameRef.current : !emailOk ? emailRef.current : msgRef.current;
      target?.focus({ preventScroll: false });
      target?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      return;
    }
    if (phase !== "form") return;
    setStatus("assembling");
    setPhase("launching");
    setSysNote("Assembling signal locally — nothing leaves your browser yet.");
    timers.current.push(
      window.setTimeout(() => {
        setPhase("collapsing");
        setSysNote("Collapsing fields into one point.");
      }, reduced ? 60 : 1500)
    );
    timers.current.push(
      window.setTimeout(() => {
        setPhase("composed");
        setStatus("handoff");
        setSysNote("Signal composed. Your mail app does the actual sending.");
        window.setTimeout(() => {
          composedRef.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
          composedRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
        }, 60);
      }, reduced ? 120 : 2500)
    );
  }

  async function handleCopy() {
    const text = buildCopyText(name, email, topic, message);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setStatus("handed");
      setSysNote("Copied. Paste it wherever you actually send email.");
    } catch {
      /* clipboard unavailable (permissions / non-secure context): select fallback */
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setStatus("handed");
        setSysNote("Copied. Paste it wherever you actually send email.");
      } catch {
        setSysNote("Copy blocked by the browser — the Open-email-app button still works.");
      }
      ta.remove();
    }
  }

  function handleOpenMail() {
    setStatus("handed");
    setSysNote("Handoff initiated — your email app now holds the signal.");
    window.location.href = mailto;
  }

  function resetAll() {
    setPhase("form");
    setStatus("ready");
    setTried(false);
    setCopied(false);
    setSysNote("New signal. Previous composition cleared locally.");
    scrollToForm();
    window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 400);
  }

  /* Guarded navigation for portals while a draft exists */
  function guardNav(href: string) {
    return (e: React.MouseEvent) => {
      if (dirty && phase === "form" && !reduced) {
        e.preventDefault();
        setPendingNav(href);
      }
    };
  }

  const statusText =
    status === "ready"
      ? "READY — composing locally"
      : status === "attention"
        ? "NEEDS ATTENTION — check the highlighted field"
        : status === "assembling"
          ? phase === "collapsing"
            ? "COLLAPSING — no network involved"
            : "ASSEMBLING — local only"
          : status === "handoff"
            ? "READY FOR HANDOFF — nothing sent yet"
            : "HANDED OFF — your mail app sends from here";

  return (
    <main
      className="ct-page"
      onMouseMove={(e) => {
        if (reduced) return;
        setMouseXY({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 });
      }}
      style={{ "--sx": `${mouseXY.x}%`, "--sy": `${mouseXY.y}%` } as CSSProperties}
    >
      <div className="ct-grain" aria-hidden="true" />
      <a href="#signal-form" className="ct-skip">
        Skip to the contact form
      </a>

      {/* Live status bar */}
      <div className="ct-statusbar" role="status" aria-live="polite">
        <span className="ct-status-left">
          <span className={status === "attention" ? "ct-live-dot is-warn" : "ct-live-dot"} aria-hidden="true" />
          CONNECTION · ONLINE
        </span>
        <span className="ct-status-msg">{sysLine}</span>
        <button
          type="button"
          className="ct-secret"
          aria-label="System label. Something hidden might live here."
          onMouseEnter={() => secretFound && setSysNote("You found something. Twice, even.")}
          onFocus={() => secretFound && setSysNote("You found something. Twice, even.")}
          onClick={() => setSysNote(secretFound ? "You found something. The K remembers." : "Just a label. Or is it? Try the logo five times.")}
        >
          SYS·01{secretFound ? " ✓" : ""}
        </button>
      </div>

      <Hero onStart={scrollToForm} reduced={reduced} />
      <Morph reduced={reduced} />

      {/* ================= FORM ================= */}
      <section id="signal-form" aria-labelledby="ct-form-h" className="ct-form-section">
        <div className={`ct-form-shell${shake ? " is-shake" : ""}`} key={shake} ref={formRef}>
          <div className="ct-form-head">
            <p className="eyebrow text-inkmuted">The signal · 4 steps</p>
            <h2 id="ct-form-h" className="display-lg ct-form-title">
              Compose the signal.
            </h2>
            <p className="ct-form-sub">
              A conversation, not a form. Answer in order — each step unlocks the next part of the story.
            </p>
            <ProgressStory active={activeStep} done={done} />
          </div>

          {phase === "composed" ? (
            <div className="ct-composed" ref={composedRef} aria-live="polite">
              <p className="ct-composed-kicker">Signal composed · local only</p>
              <h2 tabIndex={-1} className="display-lg">
                Signal ready.
                <br />
                Your mail app sends it.
              </h2>
              <p className="ct-composed-body">
                This page never transmits anything itself — there is no server inbox to claim a delivery from. The animation
                collapsed your words into one point; the buttons below hand that point to the app that actually sends email.
              </p>
              <div className="ct-composed-actions">
                <button type="button" className="ct-launch" onClick={handleOpenMail}>
                  <span className="ct-launch-arrow" aria-hidden="true">
                    ↗
                  </span>
                  Open email app
                </button>
                <button type="button" className="ct-ghost" onClick={handleCopy}>
                  {copied ? "Copied ✓" : "Copy message"}
                </button>
                <a className="ct-ghost" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
              </div>
              <details className="ct-preview">
                <summary>Preview what will be handed off</summary>
                <p>
                  <strong>Subject:</strong> [kharb.online] {topicLabel(topic)} — from {name.trim() || "a visitor"}
                </p>
                <p className="ct-preview-body">{message.trim()}</p>
                <p className="ct-preview-meta">
                  From {name.trim()} ({email.trim()}) · Topic {topicLabel(topic)}
                </p>
              </details>
              <button type="button" className="ct-reset" onClick={resetAll}>
                ← Compose a new signal
              </button>
            </div>
          ) : (
            <div className={phase === "collapsing" ? "ct-fields is-collapsing" : "ct-fields"} aria-busy={phase !== "form"}>
              {/* 01 WHO */}
              <div className={`ct-field${activeStep === 0 ? " is-active" : nameOk ? " is-done" : ""}`}>
                <label htmlFor="ct-name" className="ct-q">
                  <span className="ct-q-n">01</span> First, who are you?
                </label>
                <Magnetic strength={4}>
                  <span className="ct-input-wrap" data-spot>
                    <input
                      id="ct-name"
                      ref={nameRef}
                      name="name"
                      autoComplete="name"
                      placeholder="YOUR NAME"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      aria-invalid={tried && !nameOk}
                      aria-describedby="ct-name-hint ct-name-err"
                      className="ct-input"
                      maxLength={80}
                    />
                    <span className="ct-underline" aria-hidden="true" />
                  </span>
                </Magnetic>
                <p id="ct-name-hint" className="ct-hint">
                  Two characters minimum. A name, a handle — anything human.
                </p>
                {tried && !nameOk ? (
                  <p id="ct-name-err" role="alert" className="ct-err">
                    Give the signal a sender — at least 2 characters.
                  </p>
                ) : null}
              </div>

              {/* 02 WHERE */}
              <div className={`ct-field${activeStep === 1 ? " is-active" : emailOk ? " is-done" : ""}`}>
                <label htmlFor="ct-email" className="ct-q">
                  <span className="ct-q-n">02</span> Where can I reach you?
                </label>
                <Magnetic strength={4}>
                  <span className="ct-input-wrap" data-spot>
                    <input
                      id="ct-email"
                      ref={emailRef}
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="YOUR EMAIL"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={tried && !emailOk}
                      aria-describedby="ct-email-hint ct-email-err"
                      className="ct-input"
                      maxLength={120}
                    />
                    <span className="ct-underline" aria-hidden="true" />
                  </span>
                </Magnetic>
                <p id="ct-email-hint" className="ct-hint">
                  Only used to reply. This page stores nothing — the address travels inside your email, not our database.
                </p>
                {tried && !emailOk ? (
                  <p id="ct-email-err" role="alert" className="ct-err">
                    That email doesn&apos;t parse — check the @ and the domain.
                  </p>
                ) : null}
              </div>

              {/* 03 WHY */}
              <div className={`ct-field${activeStep === 2 ? " is-active" : msgOk ? " is-done" : ""}`}>
                <span className="ct-q" id="ct-topic-q">
                  <span className="ct-q-n">03</span> What do you want to talk about?
                </span>
                <div className="ct-chips" role="group" aria-labelledby="ct-topic-q">
                  {TOPICS.map((t) => {
                    const on = topic === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => pickTopic(t.id)}
                        className={on ? "ct-chip is-on" : "ct-chip"}
                        style={{ "--chip": t.color } as CSSProperties}
                      >
                        <span className="ct-chip-glyph" aria-hidden="true">
                          {t.glyph}
                        </span>
                        {t.label}
                        <span className="ct-chip-check" aria-hidden="true">
                          ✓
                        </span>
                      </button>
                    );
                  })}
                </div>
                {topic ? (
                  <p className="ct-hint" aria-live="polite">
                    {TOPICS.find((t) => t.id === topic)?.hint} The page tint shifts with your choice.
                  </p>
                ) : (
                  <p className="ct-hint">Optional, but it tunes the send animation. Pick one.</p>
                )}

                <label htmlFor="ct-msg" className="ct-q ct-q-gap">
                  What are we building?
                </label>
                <Magnetic strength={3}>
                  <span className="ct-input-wrap ct-msg-wrap" data-spot>
                    <textarea
                      id="ct-msg"
                      ref={msgRef}
                      name="message"
                      rows={6}
                      placeholder="Tell me what you're thinking..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, MAX_MSG))}
                      aria-invalid={tried && !msgOk}
                      aria-describedby="ct-msg-hint ct-msg-err ct-msg-count"
                      className="ct-input ct-msg"
                      maxLength={MAX_MSG}
                    />
                    <span id="ct-msg-count" className="ct-count" aria-label={`${msgLen} of ${MAX_MSG} characters`}>
                      <RolledNumber value={msgLen} />
                      <span className="ct-count-max"> / {MAX_MSG}</span>
                    </span>
                  </span>
                </Magnetic>
                <p id="ct-msg-hint" className="ct-hint">
                  10 characters minimum. Include the video URL + exact error if this is about a conversion — it makes diagnosis possible.
                </p>
                {tried && !msgOk ? (
                  <p id="ct-msg-err" role="alert" className="ct-err">
                    A little more substance — at least 10 characters so there&apos;s something to reply to.
                  </p>
                ) : null}
                <p className="ct-messy">
                  <span aria-hidden="true">
                  {"Messy ideas are welcome.".split("").map((ch, i) => (
                    <span key={i} className="ct-messy-ch" style={{ "--i": i } as CSSProperties}>
                      {ch === " " ? " " : ch}
                    </span>
                  ))}
                  </span>
                  <span className="ct-sr">Messy ideas are welcome. You don&apos;t need to have it figured out.</span>
                </p>
              </div>

              {/* 04 SEND */}
              <div className={`ct-field ct-send${activeStep === 3 ? " is-active" : ""}`}>
                <span className="ct-q">
                  <span className="ct-q-n">04</span> Ready to launch it?
                </span>
                <Magnetic strength={6}>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={phase !== "form"}
                    className={phase === "launching" ? "ct-launch is-launching" : "ct-launch"}
                    aria-describedby="ct-send-honesty"
                  >
                    <span className="ct-launch-arrow" aria-hidden="true">
                      ↗
                    </span>
                    {phase === "launching" ? "ASSEMBLING…" : "SEND SIGNAL"}
                  </button>
                </Magnetic>
                <p id="ct-send-honesty" className="ct-hint">
                  Honest mechanics: Send composes an email on your device. Nothing is transmitted until your mail app sends it.
                </p>

                <div className="ct-conn" aria-live="polite">
                  <div className="ct-conn-row">
                    <span className="ct-conn-k">CONNECTION</span>
                    <span className="ct-conn-v">
                      <span className="ct-live-dot" aria-hidden="true" /> ONLINE
                    </span>
                  </div>
                  <div className="ct-conn-row">
                    <span className="ct-conn-k">SIGNAL STATUS</span>
                    <span className="ct-conn-v">{statusText}</span>
                  </div>
                  <div className="ct-conn-bar" aria-hidden="true">
                    <span style={{ transform: `scaleX(${(done.filter(Boolean).length / 4).toFixed(2)})` }} />
                  </div>
                </div>
              </div>

              {/* Transmit theatre overlay */}
              {phase !== "form" ? (
                <div className="ct-theatre" aria-hidden="true">
                  <div className="ct-theatre-rows">
                    <span>NAME ──────┐</span>
                    <span>EMAIL ─────┤</span>
                    <span>MESSAGE ───┘</span>
                  </div>
                  <div className="ct-theatre-stream">DATA STREAM</div>
                  <div className="ct-theatre-dot" />
                  <div className="ct-ripple" />
                  <div className="ct-ripple is-2" />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* ================= PORTALS ================= */}
      <section aria-labelledby="ct-portals-h" className="ct-portals">
        <p className="eyebrow text-inkmuted">Other ways to connect</p>
        <h2 id="ct-portals-h" className="display-xl ct-portals-title">
          Not a form person?
        </h2>
        <ul className="ct-portal-grid">
          <li>
            <Magnetic>
              <a href={`mailto:${CONTACT_EMAIL}`} onClick={guardNav(`mailto:${CONTACT_EMAIL}`)} className="ct-portal is-email">
                <span className="ct-portal-k">EMAIL · direct</span>
                <span className="ct-portal-t">Email me.</span>
                <span className="ct-portal-d">{CONTACT_EMAIL} — include the URL + error for conversion issues.</span>
                <span className="ct-portal-go" aria-hidden="true">
                  →
                </span>
              </a>
            </Magnetic>
          </li>
          <li>
            <Magnetic>
              <Link href="/how-to-convert-video-to-mp3" onClick={guardNav("/how-to-convert-video-to-mp3")} className="ct-portal is-guide">
                <span className="ct-portal-k">GUIDE · self-serve</span>
                <span className="ct-portal-t">Read the guide.</span>
                <span className="ct-portal-d">Most conversion failures are solved in 3 minutes, no email needed.</span>
                <span className="ct-portal-go" aria-hidden="true">
                  →
                </span>
              </Link>
            </Magnetic>
          </li>
          <li>
            <Magnetic>
              <Link href="/faq" onClick={guardNav("/faq")} className="ct-portal is-faq">
                <span className="ct-portal-k">FAQ · instant</span>
                <span className="ct-portal-t">Browse answers.</span>
                <span className="ct-portal-d">Expired links, unsupported hosts, throttling — all documented.</span>
                <span className="ct-portal-go" aria-hidden="true">
                  →
                </span>
              </Link>
            </Magnetic>
          </li>
        </ul>

        <div className="ct-truth">
          <div className="card-charcoal ct-truth-card">
            <p className="ct-truth-h">Before you write</p>
            <p className="ct-truth-b">
              Expired files cannot be recovered — re-running the conversion beats asking for a restore. Photo of the error text
              beats a paraphrase: paste it verbatim.
            </p>
          </div>
          <div className="card-charcoal ct-truth-card">
            <p className="ct-truth-h">Abuse &amp; rights-holder reports</p>
            <p className="ct-truth-b">
              Email with the material details + your relationship to it, promptly: temporary files delete automatically and
              can&apos;t be reviewed afterwards. Only convert content you own or may keep.
            </p>
          </div>
        </div>
      </section>

      {/* ================= FINALE ================= */}
      <section aria-labelledby="ct-finale-h" className="ct-finale" onMouseMove={onFinaleMove}>
        <h2 id="ct-finale-h" className="ct-finale-giant">
          TALK SOON
          <span
            className="ct-finale-dot"
            aria-hidden="true"
            style={{ transform: `translate3d(${finaleXY.x.toFixed(1)}px, ${finaleXY.y.toFixed(1)}px, 0)` }}
          >
            .
          </span>
        </h2>
        <p className="ct-finale-sub">connection remains open</p>
        <p className="ct-finale-links">
          <Link href="/" className="framer-link">
            kharb.online
          </Link>
          {" · "}
          <Link href="/about" className="framer-link">
            about
          </Link>
          {" · "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="framer-link">
            email
          </a>
        </p>
        <p className="ct-copy">© KHARB.ONLINE — temporary files by design.</p>
      </section>

      {/* Gentle leave dialog (idea #21) — never a browser alert */}
      {pendingNav ? (
        <div className="ct-leave" role="alertdialog" aria-modal="true" aria-labelledby="ct-leave-h" aria-describedby="ct-leave-d">
          <div className="ct-leave-card">
            <p id="ct-leave-h" className="ct-leave-h">
              You&apos;re leaving an unfinished conversation.
            </p>
            <p id="ct-leave-d" className="ct-leave-d">
              Your draft stays right here in this tab — nothing is saved or sent. Leave anyway?
            </p>
            <div className="ct-leave-actions">
              <button type="button" className="ct-ghost" onClick={() => setPendingNav(null)} autoFocus>
                Continue writing
              </button>
              <a
                className="ct-launch ct-launch-sm"
                href={pendingNav}
                onClick={() => setPendingNav(null)}
              >
                Leave <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
