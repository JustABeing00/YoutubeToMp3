"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Converter } from "@/components/Converter";
import { Reveal } from "@/components/Reveal";

/* ------------------------------------------------------------------ */
/* small shared hooks (zero deps, rAF + IntersectionObserver only)     */
/* ------------------------------------------------------------------ */

function useInViewOnce<T extends HTMLElement>(margin = "0px 0px -15% 0px") {
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
          if (!en.isIntersecting) continue;
          io.disconnect();
          setInView(true);
        }
      },
      { rootMargin: margin, threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return { ref, inView } as const;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    try {
      setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch {
      /* noop */
    }
  }, []);
  return reduced;
}

/** Magnetic hover for primary CTAs — fine pointers only, ≤6px. */
function useMagnetic<T extends HTMLElement>(strength = 6) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.18;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.22;
        const cx = Math.max(-strength, Math.min(strength, dx));
        const cy = Math.max(-strength, Math.min(strength, dy));
        el.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.transition = "transform 0.45s cubic-bezier(0.22,1,0.36,1)";
      el.style.transform = "translate(0,0)";
      window.setTimeout(() => {
        el.style.transition = "";
      }, 480);
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [strength]);
  return ref;
}

/* ------------------------------------------------------------------ */
/* 1. HERO waveform canvas — reacts to mouse, scroll, hover            */
/* ------------------------------------------------------------------ */

function HeroWaveform() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    let mx = 0.5;
    let targetMx = 0.5;
    let energy = 0.55;
    let targetEnergy = 0.55;
    let scrollBoost = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = Math.max(280, rect.width);
      h = Math.max(120, rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      targetMx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      targetEnergy = 0.85;
    };
    const onLeave = () => {
      targetMx = 0.5;
      targetEnergy = 0.55;
    };
    const onScroll = () => {
      scrollBoost = Math.min(0.5, scrollBoost + 0.12);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });

    let t = 0;
    const draw = () => {
      t += 0.016;
      mx += (targetMx - mx) * 0.06;
      energy += (targetEnergy - energy) * 0.05;
      scrollBoost *= 0.94;
      const e = Math.min(1.15, energy + scrollBoost + (playing ? 0.25 : 0));
      ctx.clearRect(0, 0, w, h);
      const bars = w < 560 ? 48 : 72;
      const gap = w / bars;
      const mid = h / 2;
      for (let i = 0; i < bars; i++) {
        const x = i * gap + gap * 0.22;
        const bw = gap * 0.56;
        const proximity = 1 - Math.abs(i / bars - mx) * 1.6;
        const sway = Math.max(0.25, Math.min(1, 0.55 + proximity * 0.6));
        const wave =
          Math.sin(i * 0.42 + t * 2.1) * 0.5 +
          Math.sin(i * 0.17 - t * 1.3) * 0.35 +
          Math.sin(i * 0.71 + t * 3.1) * 0.15;
        const amp = (0.18 + Math.abs(wave) * 0.82) * sway * e;
        const bh = Math.max(4, amp * (h * 0.46));
        const y = mid - bh / 2;
        const center = 1 - Math.abs(i / bars - 0.5) * 1.1;
        const alpha = 0.28 + center * 0.6;
        // morph language: edges white, center warms toward violet/magenta
        const warm = Math.max(0, center - 0.25) * 1.4;
        const r = Math.round(255 - warm * 40);
        const g = Math.round(255 - warm * 160);
        const b = 255;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        const radius = Math.min(bw / 2, 4);
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, bw, bh, radius);
        else ctx.rect(x, y, bw, bh);
        ctx.fill();
      }
      // center baseline
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(0, mid - 0.5, w, 1);
    };

    if (reduced) {
      draw();
      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", onScroll);
      };
    }
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [playing]);

  return (
    <div ref={wrapRef} className="ht-hero-wavewrap">
      <canvas ref={ref} className="ht-hero-wave" aria-hidden="true" />
      <button
        type="button"
        className="ht-wave-play"
        aria-pressed={playing}
        onClick={() => setPlaying((p) => !p)}
      >
        <span className="ht-wave-play-dot" aria-hidden="true">
          {playing ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M3 2v8M9 2v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M4 2.5v7l5-3.5-5-3.5Z" fill="currentColor" />
            </svg>
          )}
        </span>
        {playing ? "Pause preview" : "Play preview"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Conversion theatre — auto-playing product demo                   */
/* ------------------------------------------------------------------ */

type TheatrePhase = "uploading" | "converting" | "ready";

function ConversionTheatre() {
  const { ref, inView } = useInViewOnce<HTMLDivElement>("0px 0px -20% 0px");
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<TheatrePhase>("uploading");
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setProgress(100);
      setPhase("ready");
      return;
    }
    let raf = 0;
    const start = performance.now();
    // Calm rhythm: 0.5s hold → 1.8s upload → 2.4s convert → 2.2s hold → loop
    const UP_END = 2300;
    const CONV_END = 4700;
    const HOLD_END = 7000;
    const tick = (now: number) => {
      const el = (now - start) % HOLD_END;
      if (el < 500) {
        setProgress(0);
        setPhase("uploading");
      } else if (el < UP_END) {
        const p = (el - 500) / (UP_END - 500);
        setProgress(Math.round(p * 42));
        setPhase("uploading");
      } else if (el < CONV_END) {
        const p = (el - UP_END) / (CONV_END - UP_END);
        setProgress(Math.round(42 + p * 50));
        setPhase("converting");
      } else {
        setProgress(100);
        setPhase("ready");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, runId, reduced]);

  const ring = 2 * Math.PI * 54;
  const offset = ring - (ring * Math.min(100, progress)) / 100;
  const status =
    phase === "ready"
      ? "MP3 ready — waveform generated"
      : phase === "uploading"
        ? "Uploading video.mp4…"
        : "Converting audio… 192 kbps";

  return (
    <div ref={ref} className={`ht-theatre${inView ? " is-in" : ""}`}>
      <div className="ht-theatre-head">
        <p className="ht-kicker">Live demo · auto-plays</p>
        <div className="ht-theatre-filetabs" aria-hidden="true">
          <span className={`ht-filetab${phase !== "ready" ? " is-on" : ""}`}>video.mp4</span>
          <span className="ht-filetab-arrow" aria-hidden="true">→</span>
          <span className={`ht-filetab is-mp3${phase === "ready" ? " is-on" : ""}`}>video.mp3</span>
        </div>
      </div>

      <div className="ht-theatre-stage">
        <div className="ht-ringwrap">
          <svg className="ht-ring" viewBox="0 0 128 128" role="img" aria-label={`Conversion ${progress} percent`}>
            <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            <circle
              cx="64"
              cy="64"
              r="54"
              fill="none"
              stroke="#fff"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={ring}
              strokeDashoffset={offset}
              transform="rotate(-90 64 64)"
              className="ht-ring-fg"
            />
          </svg>
          <div className="ht-ring-center">
            <span className="ht-ring-pct">{progress}%</span>
            <span className="ht-ring-sub">{phase === "ready" ? "done" : phase}</span>
          </div>
          {phase === "ready" && (
            <span className="ht-ring-tick" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="11" fill="#22c55e" />
                <path d="M7 11.4l2.6 2.6L15 8.6" stroke="#00130a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>

        <div className="ht-theatre-meta">
          <p className="ht-status" role="status" aria-live="polite">
            <span className={`ht-pulse${phase === "ready" ? " is-done" : ""}`} aria-hidden="true" />
            {status}
          </p>
          <div className="ht-mini-wave" aria-hidden="true">
            {Array.from({ length: 36 }).map((_, i) => {
              const grown = progress > (i / 36) * 100;
              const hgt = 6 + Math.abs(Math.sin(i * 0.7) * 22) * (grown ? 1 : 0.3);
              return (
                <i
                  key={i}
                  style={{ height: `${hgt.toFixed(0)}px`, opacity: grown ? 1 : 0.3 }}
                  className={phase === "converting" ? "is-live" : undefined}
                />
              );
            })}
          </div>
          <ol className="ht-stage-steps">
            <li className={progress >= 0 ? "is-done" : undefined}>Select</li>
            <li className={progress >= 42 ? "is-done" : undefined}>Upload</li>
            <li className={progress >= 92 ? "is-done" : undefined}>Convert</li>
            <li className={phase === "ready" ? "is-done" : undefined}>Download</li>
          </ol>
          <div className="ht-theatre-actions">
            <button type="button" className="ht-ghost" onClick={() => setRunId((n) => n + 1)}>
              Replay conversion
            </button>
            <Link href="/#converter" className="ht-link-arrow">
              Try it with your link <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Fake upload demo                                                 */
/* ------------------------------------------------------------------ */

type DemoState = "idle" | "file" | "working" | "done";

function UploadDemo() {
  const [state, setState] = useState<DemoState>("idle");
  const [pct, setPct] = useState(0);
  const reduced = useReducedMotion();

  const startFake = useCallback(() => {
    if (reduced) {
      setState("done");
      setPct(100);
      return;
    }
    setState("working");
    setPct(0);
    let raf = 0;
    const t0 = performance.now();
    const DUR = 2800;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / DUR);
      // ease with a tiny stall at 67% for realism
      const eased = p < 0.6 ? p * 1.05 : 0.63 + (p - 0.6) * 0.925;
      setPct(Math.round(Math.min(1, eased) * 100));
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        setPct(100);
        setState("done");
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  useEffect(() => {
    if (state !== "working") return;
    const cancel = startFake();
    return () => cancel?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state === "working"]);

  return (
    <div className="ht-demo">
      <div
        className={`ht-drop${state !== "idle" ? " has-file" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (state === "idle") setState("file");
        }}
      >
        {state === "idle" && (
          <>
            <span className="ht-drop-icon" aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                <rect x="3" y="6" width="28" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M13.5 12.5v7l6-3.5-6-3.5Z" fill="currentColor" />
                <path d="M10 29h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <p className="ht-drop-title">Drop a video here</p>
            <p className="ht-drop-sub">or</p>
            <button type="button" className="ht-btn-white" onClick={() => setState("file")}>
              Browse demo files
            </button>
            <p className="ht-drop-note">Demo only — nothing uploads. Your real files stay on your device until you convert.</p>
          </>
        )}
        {state !== "idle" && (
          <div className="ht-demo-file">
            <div className="ht-demo-filerow">
              <span className="ht-demo-thumb" aria-hidden="true">MP4</span>
              <span className="ht-demo-filemeta">
                <span className="ht-demo-filename">demo.mp4 · 24.6 MB · 04:12</span>
                <span className="ht-demo-filestatus" role="status">
                  {state === "file" && "Ready to convert"}
                  {state === "working" && `Converting… ${pct}%`}
                  {state === "done" && "MP3 ready ✓"}
                </span>
              </span>
              {state === "done" ? (
                <span className="ht-demo-tick" aria-hidden="true">✓</span>
              ) : (
                <button type="button" className="ht-demo-remove" onClick={() => { setState("idle"); setPct(0); }} aria-label="Remove demo file">
                  ✕
                </button>
              )}
            </div>
            <div className="ht-demo-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state === "file" ? 0 : pct} aria-label="Demo conversion progress">
              <span style={{ transform: `scaleX(${(state === "file" ? 0 : pct) / 100})` }} />
            </div>
            <div className="ht-demo-wave" aria-hidden="true">
              {Array.from({ length: 44 }).map((_, i) => {
                const on = state === "done" || pct > (i / 44) * 100;
                return <i key={i} style={{ opacity: on ? 1 : 0.25, height: `${5 + Math.abs(Math.sin(i * 0.55)) * 20}px` }} className={state === "working" ? "is-live" : undefined} />;
              })}
            </div>
            {state === "file" && (
              <button type="button" className="ht-btn-white ht-btn-big" onClick={() => setState("working")}>
                Convert to MP3 →
              </button>
            )}
            {state === "working" && <p className="ht-demo-hint">Extracting audio… encoding 192 kbps…</p>}
            {state === "done" && (
              <div className="ht-demo-done">
                <div className="ht-demo-mp3row">
                  <span className="ht-demo-thumb is-mp3" aria-hidden="true">MP3</span>
                  <span className="ht-demo-filemeta">
                    <span className="ht-demo-filename">demo.mp3 · 5.6 MB</span>
                    <span className="ht-demo-filestatus">Waveform generated · expires in demo only</span>
                  </span>
                  <span className="ht-demo-tick" aria-hidden="true">✓</span>
                </div>
                <div className="ht-demo-actions">
                  <Link href="/#converter" className="ht-btn-white ht-btn-big">
                    Convert your video →
                  </Link>
                  <button type="button" className="ht-ghost" onClick={() => { setState("idle"); setPct(0); }}>
                    Reset demo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Scroll story — sticky visual + journey line                      */
/* ------------------------------------------------------------------ */

const STORY = [
  {
    n: "01",
    title: "Choose your video",
    body: "Copy a link to content you own or have permission to keep — a public watch URL, youtu.be shortcut, or Short. The converter validates it before anything else happens.",
    tag: "Paste · validate · preview",
  },
  {
    n: "02",
    title: "Start conversion",
    body: "Pick 128–320 kbps (192 kbps is the sweet spot), then hit Convert. The job queues, retrieves source audio, and transcodes with FFmpeg — progress is real, not theatre.",
    tag: "Queue · retrieve · transcode",
  },
  {
    n: "03",
    title: "Download your MP3",
    body: "A temporary link appears with filename and size. Save it before it expires in ~30 minutes. Source files are already gone; the MP3 follows. Need it again? Just re-run.",
    tag: "Temporary link · nothing kept",
  },
];

function ScrollStory() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(0);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFallback(true);
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
      const p = total <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / total));
      setProgress(p);
      setActive(Math.min(2, Math.max(0, Math.floor(p * 3 + 1e-4))));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const jump = useCallback((i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = window.scrollY + rect.top;
    const total = rect.height - window.innerHeight;
    window.scrollTo({ top: top + (total * (i + 0.5)) / 3, behavior: "smooth" });
  }, []);

  return (
    <div ref={trackRef} className={`ht-story${fallback ? " is-fallback" : ""}`}>
      <div className="ht-story-sticky">
        <div className="ht-story-inner">
          <div className="ht-story-visual" aria-hidden={!fallback}>
            <div className="ht-phone">
              <div className="ht-phone-bar">
                <i /><i /><i />
              </div>
              <div className="ht-phone-url">kharb.online</div>
              <div className={`ht-phone-file${active >= 0 ? " is-show" : ""}`}>
                <span className="ht-phone-chip">video.mp4</span>
                <span className="ht-phone-check" style={{ opacity: active >= 0 ? 1 : 0 }}>✓ validated</span>
              </div>
              <div className={`ht-phone-btn${active === 1 ? " is-lit" : ""}${active > 1 ? " is-done" : ""}`}>
                {active < 2 ? "Convert to MP3" : "✓ Converting… 67%"}
              </div>
              <div className="ht-phone-progress">
                <span style={{ transform: `scaleX(${active === 0 ? 0.08 : active === 1 ? 0.67 : 1})` }} />
              </div>
              <div className={`ht-phone-mp3${active >= 2 ? " is-out" : ""}`}>
                <span className="ht-phone-wave" aria-hidden="true">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <i key={i} style={{ height: `${4 + Math.abs(Math.sin(i * 0.8)) * 16}px` }} />
                  ))}
                </span>
                <span className="ht-phone-chip is-mp3">audio.mp3 ✓</span>
              </div>
              <p className="ht-phone-step">STEP 0{active + 1} / 03</p>
            </div>
          </div>

          <div className="ht-story-copy">
            <div className="ht-journey" aria-hidden="true">
              <span className="ht-journey-line" />
              <span className="ht-journey-fill" style={{ height: fallback ? "100%" : `${progress * 100}%` }} />
            </div>
            <ol className="ht-story-list">
              {STORY.map((s, i) => (
                <li key={s.n} className={`ht-story-item${(fallback || i === active) ? " is-on" : ""}${i < active ? " is-past" : ""}`}>
                  <button type="button" className="ht-story-btn" onClick={() => jump(i)} aria-current={i === active}>
                    <span className="ht-story-n">{s.n}</span>
                    <span className="ht-story-t">{s.title}</span>
                  </button>
                  <span className="ht-story-b">{s.body}</span>
                  <span className="ht-story-tag">{s.tag}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Before → After (scroll morph)                                    */
/* ------------------------------------------------------------------ */

function BeforeAfter() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [m, setM] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setM(1);
      return;
    }
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.7)));
      setM(p);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const collapse = Math.min(1, m * 1.6);
  const emerge = Math.max(0, (m - 0.45) / 0.55);

  return (
    <div ref={ref} className="ht-ba">
      <div
        className="ht-ba-video"
        style={{
          transform: `scale(${1 - collapse * 0.35})`,
          borderRadius: `${20 + collapse * 60}px`,
          opacity: 1 - Math.max(0, (m - 0.6) / 0.4) * 0.9,
        }}
      >
        <span className="ht-ba-label">Your video</span>
        <span className="ht-ba-filename">🎬 video.mp4</span>
        <span className="ht-ba-dim">1920 × 1080 · 04:12 · 24.6 MB</span>
      </div>

      <div className="ht-ba-mid" aria-hidden="true">
        <span className="ht-ba-arrow">↓</span>
        <span className="ht-ba-particles">
          {Array.from({ length: 28 }).map((_, i) => (
            <i
              key={i}
              style={{
                opacity: 0.2 + m * 0.8,
                transform: `translateY(${(Math.sin(i * 1.7) * 14 * m).toFixed(1)}px) scale(${0.6 + m * 0.9})`,
              }}
            />
          ))}
        </span>
        <span className="ht-ba-wave" style={{ opacity: 0.25 + m * 0.75, transform: `scaleX(${0.5 + m * 0.5})` }} aria-hidden="true">
          {Array.from({ length: 40 }).map((_, i) => (
            <i key={i} style={{ height: `${4 + Math.abs(Math.sin(i * 0.6 + m * 4)) * 22}px` }} />
          ))}
        </span>
        <span className="ht-ba-arrow">↓</span>
      </div>

      <div
        className="ht-ba-audio"
        style={{
          transform: `scale(${0.8 + emerge * 0.2}) translateY(${(1 - emerge) * 26}px)`,
          opacity: emerge,
        }}
      >
        <span className="ht-ba-label">Your audio</span>
        <span className="ht-ba-filename">🎵 video.mp3</span>
        <span className="ht-ba-dim">192 kbps · 5.6 MB · portable</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 9. Kinetic strip (horizontal type driven by vertical scroll)        */
/* ------------------------------------------------------------------ */

function KineticStrip() {
  const ref = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    const rail = railRef.current;
    if (!el || !rail) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      const max = Math.max(0, rail.scrollWidth - el.clientWidth);
      rail.style.transform = `translateX(${(-p * max).toFixed(1)}px)`;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="ht-kinetic" aria-label="Video is visual. Audio is portable.">
      <div ref={railRef} className="ht-kinetic-rail" aria-hidden="true">
        <span className="ht-kinetic-line is-outline">VIDEO IS VISUAL.</span>
        <span className="ht-kinetic-line">AUDIO IS PORTABLE.</span>
        <span className="ht-kinetic-line is-accent">WE TURN ONE INTO THE OTHER.</span>
        <span className="ht-kinetic-line is-outline">VIDEO IS VISUAL.</span>
        <span className="ht-kinetic-line">AUDIO IS PORTABLE.</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 13. Formats orbit                                                   */
/* ------------------------------------------------------------------ */

function FormatsOrbit() {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const chips = ["MP4", "MOV", "AVI", "MKV", "WEBM", "M4V"];
  return (
    <div ref={ref} className={`ht-orbit${inView ? " is-in" : ""}`}>
      <div className="ht-orbit-stage" aria-hidden="true">
        <span className="ht-orbit-ring is-r1" />
        <span className="ht-orbit-ring is-r2" />
        {chips.map((c, i) => (
          <span key={c} className="ht-orbit-chip" style={{ ["--a" as string]: `${i * (360 / chips.length)}deg` } as React.CSSProperties}>
            <span className="ht-orbit-pill">{c}</span>
          </span>
        ))}
        <span className="ht-orbit-center">
          <span className="ht-orbit-video">VIDEO</span>
          <span className="ht-orbit-arrow">→</span>
          <span className="ht-orbit-mp3">MP3</span>
        </span>
      </div>
      <ul className="ht-format-list">
        {chips.map((c) => (
          <li key={c}>{c}</li>
        ))}
        <li className="is-out">→ MP3</li>
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 10. Cinematic timeline                                              */
/* ------------------------------------------------------------------ */

function WatchTimeline() {
  const ref = useRef<HTMLOListElement | null>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setP(1);
      return;
    }
    const io = new IntersectionObserver(
      ([en]) => {
        if (!en) return;
        const r = (en.target as HTMLElement).getBoundingClientRect();
        const vh = window.innerHeight;
        setP(Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (vh * 0.6 + r.height * 0.4))));
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      setP(Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (vh * 0.6 + r.height * 0.4))));
    };
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  const rows = [
    { t: "00:00", label: "Select video", sub: "Copy a public link you may keep" },
    { t: "00:02", label: "Upload", sub: "Validate + fetch title & duration" },
    { t: "00:04", label: "Convert", sub: "FFmpeg transcodes at your bitrate" },
    { t: "00:07", label: "MP3 generated", sub: "Waveform + file ready" },
    { t: "00:08", label: "Download", sub: "Temporary link · expires ~30 min" },
  ];
  return (
    <ol ref={ref} className="ht-timeline">
      <span className="ht-timeline-line" aria-hidden="true" />
      <span className="ht-timeline-fill" style={{ height: `${p * 100}%` }} aria-hidden="true" />
      {rows.map((r, i) => {
        const on = p * rows.length > i + 0.25;
        return (
          <li key={r.t} className={`ht-timeline-row${on ? " is-on" : ""}`}>
            <span className="ht-timeline-dot" aria-hidden="true" />
            <span className="ht-timeline-time">{r.t}</span>
            <span className="ht-timeline-text">
              <span className="ht-timeline-label">{r.label}</span>
              <span className="ht-timeline-sub">{r.sub}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* 15. Minimal FAQ                                                     */
/* ------------------------------------------------------------------ */

const MINI_FAQS = [
  {
    q: "Which links actually work?",
    a: "Public YouTube watch URLs, youtu.be shortcuts, Shorts, embeds, and music.youtube.com. Private, deleted, sign-in-only, or region-blocked videos fail at analysis — by design, before anything downloads.",
  },
  {
    q: "What quality should I pick?",
    a: "192 kbps suits almost everything. Use 128 kbps for the smallest files (speech, drafts) and 256–320 kbps when you want to preserve the source as closely as possible. Higher numbers never restore lost detail.",
  },
  {
    q: "How long does conversion take?",
    a: "Seconds for short clips, longer for long videos. Only a couple of jobs run at once, so brief queuing at busy moments is normal — progress is reported live from the real encoder.",
  },
  {
    q: "Where do my files go?",
    a: "Nowhere permanent. Source material is deleted the moment transcoding finishes; finished MP3s expire after ~30 minutes. Cancelling wipes working files immediately. Expired files cannot be recovered.",
  },
  {
    q: "Can I convert anything I find?",
    a: "Only content you own or have explicit permission to download — your recordings, Creative Commons material, or anything you are allowed to keep. Respect platform terms and copyright law.",
  },
];

function MiniFaq() {
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));
  const toggle = useCallback((i: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);
  return (
    <div className="ht-faq">
      {MINI_FAQS.map((f, i) => {
        const isOpen = open.has(i);
        return (
          <div key={f.q} className={`ht-faq-item${isOpen ? " is-open" : ""}`}>
            <button
              type="button"
              className="ht-faq-q"
              aria-expanded={isOpen}
              aria-controls={`ht-faq-a-${i}`}
              id={`ht-faq-q-${i}`}
              onClick={() => toggle(i)}
            >
              <span className="ht-faq-qtext">{f.q}</span>
              <span className="ht-faq-plus" aria-hidden="true">
                <span className="ht-faq-h" />
                <span className="ht-faq-v" />
              </span>
            </button>
            <div className="ht-faq-wrap">
              <div className="ht-faq-a" role="region" id={`ht-faq-a-${i}`} aria-labelledby={`ht-faq-q-${i}`} aria-hidden={!isOpen}>
                <p>{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
      <p className="ht-faq-more">
        Still have questions? <Link href="/faq" className="framer-link">Visit FAQ</Link>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 17. Finale morph — VIDEO → waveform → MP3                           */
/* ------------------------------------------------------------------ */

function FinaleMorph() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setP(1);
      return;
    }
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      setP(Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (vh * 0.75))));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // three crossfading stages
  const videoO = Math.max(0, 1 - p * 2.4);
  const waveO = Math.max(0, 1 - Math.abs(p - 0.5) * 2.6);
  const mp3O = Math.max(0, (p - 0.55) / 0.45);

  return (
    <div ref={ref} className="ht-finale-stage" style={{ ["--fp" as string]: p } as React.CSSProperties}>
      <div className="ht-finale-word" style={{ opacity: videoO, filter: `blur(${(1 - videoO) * 12}px)`, transform: `scale(${0.9 + videoO * 0.1}) translateY(${(1 - videoO) * 20}px)` }} aria-hidden={p > 0.4}>
        VIDEO
      </div>
      <div className="ht-finale-wave" style={{ opacity: waveO, transform: `scale(${0.9 + waveO * 0.1})` }} aria-hidden="true">
        {Array.from({ length: 56 }).map((_, i) => (
          <i key={i} style={{ height: `${8 + Math.abs(Math.sin(i * 0.5 + p * 6)) * 52}px`, opacity: 0.3 + waveO * 0.7 }} />
        ))}
      </div>
      <div className="ht-finale-word is-mp3" style={{ opacity: mp3O, filter: `blur(${(1 - mp3O) * 12}px)`, transform: `scale(${0.9 + mp3O * 0.1}) translateY(${(1 - mp3O) * -20}px)` }} aria-hidden={p < 0.6}>
        MP3
      </div>
      <p className="ht-finale-cap" style={{ opacity: mp3O }}>
        That&apos;s it. You&apos;re done.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

const WHY_CARDS = [
  { icon: "🎧", title: "Music", body: "Extract audio from videos you own — live takes, your own uploads, Creative Commons tracks — for portable listening.", tone: "" },
  { icon: "🎙️", title: "Podcasts", body: "Save long-form talk and interviews as MP3 for offline walks, commutes, and flights.", tone: "is-violet" },
  { icon: "📚", title: "Learning", body: "Keep lectures and tutorials you are allowed to keep as audio you can replay anywhere.", tone: "" },
  { icon: "🚗", title: "Offline listening", body: "No video stream, no battery drain, no signal needed — just the sound, in any player.", tone: "is-orange" },
];

function WhyCard({ c, i }: { c: (typeof WHY_CARDS)[number]; i: number }) {
  const { ref, inView } = useInViewOnce<HTMLLIElement>();
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -8;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 8;
      el.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-3px)`;
    };
    const onLeave = () => {
      el.style.transition = "transform 0.5s cubic-bezier(0.22,1,0.36,1)";
      el.style.transform = "";
      window.setTimeout(() => {
        el.style.transition = "";
      }, 520);
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <li ref={ref} className={`ht-why-li${inView ? " is-in" : ""} ${i % 2 === 0 ? "is-left" : "is-right"}`} style={{ ["--i" as string]: i } as React.CSSProperties}>
      <div ref={cardRef} className={`ht-why-card ${c.tone}`}>
        <span className="ht-why-icon" aria-hidden="true">{c.icon}</span>
        <span className="ht-why-title">{c.title}</span>
        <span className="ht-why-body">{c.body}</span>
      </div>
    </li>
  );
}

export function HowToExperience() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const heroRef = useRef<HTMLElement | null>(null);
  const [heroIn, setHeroIn] = useState(false);
  const ctaMagnet = useMagnetic<HTMLAnchorElement>(7);
  const cta2Magnet = useMagnetic<HTMLAnchorElement>(7);

  // hero entrance: scale + blur → sharp
  useEffect(() => {
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setHeroIn(true)));
    return () => cancelAnimationFrame(t);
  }, []);

  // cursor-following glow on hero
  useEffect(() => {
    const el = heroRef.current;
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

  // top scroll progress
  const barRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / h));
      if (barRef.current) barRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="ht-page">
      <div className="ht-progress" aria-hidden="true"><span ref={barRef} /></div>

      {/* ============ 1. HERO ============ */}
      <section ref={heroRef} aria-labelledby={`${uid}-hero`} className={`ht-hero${heroIn ? " is-in" : ""}`}>
        <div className="ht-hero-glow" aria-hidden="true" />
        <span className="ht-orb is-a" aria-hidden="true" />
        <span className="ht-orb is-b" aria-hidden="true" />
        {/* floating conversion chips — restrained parallax decor */}
        <span className="ht-float is-f1" aria-hidden="true">video.mp4</span>
        <span className="ht-float is-f2" aria-hidden="true">Converting… 67%</span>
        <span className="ht-float is-f3" aria-hidden="true">audio.mp3 ✓</span>

        <div className="ht-hero-inner">
          <p className="ht-eyebrow">
            <span className="ht-live-dot" aria-hidden="true" />
            How to convert · 3 steps · ~8 seconds to learn
          </p>
          <h1 id={`${uid}-hero`} className="ht-hero-title">
            <span className="ht-hero-video">VIDEO</span>
            <span className="ht-hero-arrow" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
                <path d="M22 5v30M12 25l10 10 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="ht-hero-mp3">MP3</span>
          </h1>
          <p className="ht-hero-sub">Video → MP3. That&apos;s it. Watch the conversion happen — then do it for real in three steps.</p>

          <HeroWaveform />

          <div className="ht-hero-ctas">
            <Link ref={ctaMagnet} href="#ht-demo" className="ht-btn-white ht-btn-big">
              Watch it work <span aria-hidden="true">→</span>
            </Link>
            <Link ref={cta2Magnet} href="#ht-try" className="ht-btn-ghost">
              Convert now
            </Link>
          </div>
          <dl className="ht-hero-meta">
            <div><dt>No account</dt><dd>paste · convert · done</dd></div>
            <div><dt>~30 min</dt><dd>files delete themselves</dd></div>
            <div><dt>128–320</dt><dd>kbps, your call</dd></div>
          </dl>
        </div>
        <a href="#ht-theatre" className="ht-scrollcue" aria-label="Scroll to the conversion demo">
          Scroll
          <span className="ht-scrollcue-line" aria-hidden="true" />
        </a>
      </section>

      {/* ============ 2. THEATRE ============ */}
      <section aria-labelledby={`${uid}-theatre`} className="ht-section" id="ht-theatre">
        <div className="ht-wrap">
          <p className="eyebrow text-inkmuted">The conversion, up close</p>
          <Reveal as="h2" id={`${uid}-theatre`} className="display-xl mt-4 max-w-3xl text-balance text-ink">
            You are watching the conversion happen
          </Reveal>
          <p className="body-lg mt-4 max-w-2xl">Not documentation — a product demo. Uploading, converting, waveform, checkmark. The real tool below works exactly like this.</p>
          <ConversionTheatre />
        </div>
      </section>

      {/* ============ 7. DEMO (calm after animation) ============ */}
      <section aria-labelledby={`${uid}-demo`} className="ht-section ht-section-calm" id="ht-demo">
        <div className="ht-wrap">
          <p className="eyebrow text-inkmuted">Try the motion</p>
          <Reveal as="h2" id={`${uid}-demo`} className="display-lg mt-4 max-w-2xl text-balance text-ink">
            Touch a demo converter
          </Reveal>
          <p className="body-lg mt-4 max-w-2xl">No reading required. Drop the fake file, hit convert, watch it become audio — then use the real thing underneath.</p>
          <UploadDemo />
        </div>
      </section>

      {/* ============ 3+4. SCROLL STORY + JOURNEY LINE ============ */}
      <section aria-labelledby={`${uid}-story`} className="ht-section ht-section-story">
        <div className="ht-wrap">
          <p className="eyebrow text-inkmuted">How it works</p>
          <Reveal as="h2" id={`${uid}-story`} className="display-xl mt-4 max-w-3xl text-balance text-ink">
            Three steps, one fixed screen
          </Reveal>
          <p className="body-lg mt-4 max-w-2xl">Scroll. The interface stays put while the explanation changes beside it — the biggest wow on this page.</p>
        </div>
        <ScrollStory />
      </section>

      {/* ============ 5. BEFORE → AFTER ============ */}
      <section aria-labelledby={`${uid}-before`} className="ht-section">
        <div className="ht-wrap ht-wrap-narrow">
          <p className="eyebrow text-inkmuted">Before → after</p>
          <Reveal as="h2" id={`${uid}-before`} className="display-lg mt-4 text-balance text-ink">
            The video collapses into a waveform
          </Reveal>
          <BeforeAfter />
        </div>
      </section>

      {/* ============ 8. WHY ============ */}
      <section aria-labelledby={`${uid}-why`} className="ht-section ht-section-calm">
        <div className="ht-wrap">
          <p className="eyebrow text-inkmuted">Why convert video to MP3?</p>
          <Reveal as="h2" id={`${uid}-why`} className="display-xl mt-4 max-w-3xl text-balance text-ink">
            Sound goes where picture can&apos;t
          </Reveal>
          <ul className="ht-why-grid">
            {WHY_CARDS.map((c, i) => (
              <WhyCard key={c.title} c={c} i={i} />
            ))}
          </ul>
        </div>
      </section>

      {/* ============ 13. FORMATS ============ */}
      <section aria-labelledby={`${uid}-formats`} className="ht-section">
        <div className="ht-wrap ht-wrap-narrow ht-center">
          <p className="eyebrow text-inkmuted">Supported formats</p>
          <Reveal as="h2" id={`${uid}-formats`} className="display-lg mt-4 text-balance text-ink">
            Many formats in. One MP3 out.
          </Reveal>
          <p className="body-lg mt-4">Standard video containers converge into a single portable audio file.</p>
          <FormatsOrbit />
        </div>
      </section>

      {/* ============ 10. TIMELINE ============ */}
      <section aria-labelledby={`${uid}-timeline`} className="ht-section ht-section-calm">
        <div className="ht-wrap ht-timeline-grid">
          <div>
            <p className="eyebrow text-inkmuted">Watch the conversion</p>
            <Reveal as="h2" id={`${uid}-timeline`} className="display-lg mt-4 text-balance text-ink">
              Eight seconds, frame by frame
            </Reveal>
            <p className="body-lg mt-4 max-w-md">A cinematic clock of what the tool actually does — from link to download.</p>
            <Link href="/#converter" className="ht-link-arrow ht-timeline-cta">
              Run your own 8 seconds <span aria-hidden="true">→</span>
            </Link>
          </div>
          <WatchTimeline />
        </div>
      </section>

      {/* ============ 9. KINETIC ============ */}
      <section aria-label="Kinetic statement" className="ht-section ht-section-tight">
        <KineticStrip />
      </section>

      {/* ============ 14. SIMPLICITY (calm, dramatic type) ============ */}
      <section aria-labelledby={`${uid}-simple`} className="ht-section ht-section-calm">
        <div className="ht-wrap ht-center">
          <Reveal as="h2" id={`${uid}-simple`} className="display-xl mx-auto max-w-4xl text-balance text-ink">
            No complex software. No complicated steps.
          </Reveal>
          <p className="ht-simple-reveal">Just 3 simple steps.</p>
          <ol className="ht-simple-steps">
            <li><span>01</span> Paste link</li>
            <li><span>02</span> Convert</li>
            <li><span>03</span> Download</li>
          </ol>
        </div>
      </section>

      {/* ============ 15. MINI FAQ ============ */}
      <section aria-labelledby={`${uid}-faq`} className="ht-section">
        <div className="ht-wrap ht-faq-grid">
          <div>
            <p className="eyebrow text-inkmuted">Quick answers</p>
            <Reveal as="h2" id={`${uid}-faq`} className="display-lg mt-4 text-balance text-ink">
              Stuck? Start here.
            </Reveal>
            <p className="body-lg mt-4 max-w-sm">Five honest answers. The full library lives on the FAQ page.</p>
          </div>
          <MiniFaq />
        </div>
      </section>

      {/* ============ 16. TRY IT NOW (real converter) ============ */}
      <section aria-labelledby={`${uid}-try`} className="ht-section ht-section-calm" id="ht-try">
        <div className="ht-wrap ht-center">
          <p className="eyebrow text-inkmuted">Try it now</p>
          <Reveal as="h2" id={`${uid}-try`} className="display-xl mx-auto mt-4 max-w-3xl text-balance text-ink">
            Ready to convert? Drop your video here.
          </Reveal>
          <p className="body-lg mx-auto mt-4 max-w-xl">Only content you own or have permission to download. Files delete themselves after ~30 minutes.</p>
        </div>
        <Converter />
        <p className="ht-try-links">
          Prefer the walkthrough? <a href="#ht-theatre" className="framer-link">Replay the demo</a> · <Link href="/faq" className="framer-link">FAQ</Link> · <Link href="/privacy" className="framer-link">Privacy</Link>
        </p>
      </section>

      {/* ============ 17. FINALE ============ */}
      <section aria-label="Finale" className="ht-finale">
        <FinaleMorph />
        <Link href="/#converter" className="ht-btn-white ht-btn-big ht-finale-cta">
          Convert Video → MP3
        </Link>
        <p className="ht-finale-links">
          <Link href="/" className="framer-link">← Back to the Kharb converter</Link>
        </p>
      </section>
    </div>
  );
}
