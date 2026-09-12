"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Claw-tear page transition — reverse-engineered from mew.xyz's production
 * build (Nuxt chunks + Rive wiring), re-implemented on canvas.
 *
 * Their exact architecture, kept 1:1:
 *  - Fixed fullscreen canvas, z-index 99, pointer-events none, always mounted,
 *    renders only during a transition (DPR capped at 1.25, cover fit).
 *  - Theme picked when LEAVING: red on media pages, black elsewhere. Ours:
 *    signal-blue (#0099ff) when leaving home, black (#050505) elsewhere.
 *    (Their white theme input exists but is never fired — same here.)
 *  - Leave: 0.1s → fire theme + rip, route swaps at cover (+1.0s).
 *    Enter: tear wipes off the new page, renderer stops after.
 *  - Their exact CustomEase curves ("snappy", "expo-hard") sampled into LUTs.
 *
 * The Rive-authored claw itself can't be lifted (binary asset, their file),
 * so the tear is redrawn to match its beats: 3 diagonal slashes rip first,
 * then the theme floods out of them to full cover with a serrated claw edge.
 */

const BLUE = "#0099ff";
const BLACK = "#050505";

// Exact CustomEase paths registered on mew.xyz.
const SNAPPY_PATH =
  "M0,0 C0.094,0.026 0.124,0.127 0.157,0.29 0.197,0.486 0.254,0.8 0.348,0.884 0.42,0.949 0.374,1 1,1";
const EXPO_HARD_PATH =
  "M0,0 C0.084,0.61 0.156,0.822 0.218,0.883 0.287,0.951 0.374,1 1,1";

function sampleEase(path: string): (t: number) => number {
  const nums = path
    .replace(/[MC]/g, " ")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const pts: Array<[number, number]> = [];
  let prev: [number, number] = [nums[0], nums[1]];
  const STEPS = 28;
  for (let i = 2; i + 5 < nums.length + 1; i += 6) {
    const [c1x, c1y, c2x, c2y, x, y] = nums.slice(i, i + 6);
    for (let k = 1; k <= STEPS; k++) {
      const t = k / STEPS;
      const mt = 1 - t;
      pts.push([
        mt * mt * mt * prev[0] + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * x,
        mt * mt * mt * prev[1] + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * y,
      ]);
    }
    prev = [x, y];
  }
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0;
    let hi = pts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (pts[mid][0] < t) lo = mid + 1;
      else hi = mid;
    }
    const b = pts[lo];
    const a = pts[Math.max(0, lo - 1)];
    const span = b[0] - a[0] || 1e-6;
    return a[1] + ((b[1] - a[1]) * (t - a[0])) / span;
  };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ---- timings (seconds), from their delayedCalls: .1 fire, 1.0 swap ----
const LEAVE_SLASH_DUR = 0.42;
const LEAVE_SLASH_STAG = 0.09;
const LEAVE_FLOOD_START = 0.3;
const LEAVE_FLOOD_DUR = 0.75;
const LEAVE_DONE_AT = 1.1;
const ENTER_WIPE_START = 0.05;
const ENTER_WIPE_DUR = 1.05;
const ENTER_SLASH_FLASH = 0.3;
const ENTER_END = 1.3;

interface Slash {
  cx: number; // center x in rotated frame (fraction of W2)
  pts: Array<{ y: number; x: number; w: number }>;
}

export function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [, setTick] = useState(0);

  const eng = useRef({
    mode: "idle" as "idle" | "leave" | "hold" | "enter",
    t0: 0,
    raf: 0,
    theme: BLUE,
    pendingHref: null as string | null,
    done: false,
    W: 0,
    H: 0,
    dpr: 1,
    phi: 0,
    M: 0,
    W2: 0,
    H2: 0,
    slashes: [] as Slash[],
    timers: [] as number[],
  });

  const snappy = useRef<(t: number) => number>(() => 0);
  const expoHard = useRef<(t: number) => number>(() => 0);
  if (!snappy.current(1)) {
    snappy.current = sampleEase(SNAPPY_PATH);
    expoHard.current = sampleEase(EXPO_HARD_PATH);
  }

  // ---------- geometry ----------
  const buildSlashes = (E: typeof eng.current) => {
    const rnd = mulberry32(1337);
    // 3 slashes fanned across the rotated width
    const centers = [-0.3, 0.02, 0.3];
    E.slashes = centers.map((c) => {
      const p1 = rnd() * Math.PI * 2;
      const p2 = rnd() * Math.PI * 2;
      const a1 = 9 + rnd() * 7;
      const a2 = 5 + rnd() * 5;
      const pts: Slash["pts"] = [];
      const y0 = -E.H2 / 2 - 60;
      const y1 = E.H2 / 2 + 60;
      const steps = 46;
      for (let k = 0; k <= steps; k++) {
        const s = k / steps;
        const y = y0 + (y1 - y0) * s;
        const x =
          c * E.W2 +
          Math.sin((y / E.H2) * 5.1 + p1) * a1 +
          Math.sin((y / E.H2) * 11.7 + p2) * a2;
        const w = 13 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0.02, s))), 0.7) + 2;
        pts.push({ y, x, w });
      }
      return { cx: c, pts };
    });
  };

  const resize = (E: typeof eng.current, canvas: HTMLCanvasElement) => {
    const dpr = Math.min(1.25, window.devicePixelRatio || 1);
    const W = window.innerWidth;
    const H = window.innerHeight;
    E.W = W;
    E.H = H;
    E.dpr = dpr;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    // rotate so slashes run vertically; diagonal on screen
    const slant = W * 0.38;
    E.phi = Math.atan2(slant, H);
    E.W2 = Math.abs(W * Math.cos(E.phi)) + Math.abs(H * Math.sin(E.phi));
    E.H2 = Math.abs(W * Math.sin(E.phi)) + Math.abs(H * Math.cos(E.phi));
    E.M = E.W2 / 2 + 120;
    buildSlashes(E);
  };

  const withFrame = (
    E: typeof eng.current,
    ctx: CanvasRenderingContext2D,
    draw: (hw: number, hh: number) => void
  ) => {
    ctx.setTransform(E.dpr, 0, 0, E.dpr, 0, 0);
    ctx.clearRect(0, 0, E.W, E.H);
    ctx.translate(E.W / 2, E.H / 2);
    ctx.rotate(-E.phi);
    draw(E.W2 / 2, E.H2 / 2);
  };

  // Serrated claw front edge: 3 deep gashes + fine noise, in px.
  const serr = (y: number, H2: number) => {
    const tri = (v: number, c: number, w: number) => {
      const d = Math.abs(v - c) / w;
      return d >= 1 ? 0 : 1 - d;
    };
    const u = y / H2;
    return (
      -88 * tri(u, -0.24, 0.16) -
      104 * tri(u, 0.04, 0.2) -
      80 * tri(u, 0.3, 0.15) +
      Math.sin(u * 43.0) * 6 +
      Math.sin(u * 91.0 + 1.7) * 4
    );
  };

  const traceSlash = (
    ctx: CanvasRenderingContext2D,
    s: Slash,
    upTo: number // 0..1 along length
  ) => {
    const n = Math.max(2, Math.floor(s.pts.length * clamp01(upTo)));
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const p = s.pts[k];
      if (k === 0) ctx.moveTo(p.x - p.w / 2, p.y);
      else ctx.lineTo(p.x - p.w / 2, p.y);
    }
    for (let k = n - 1; k >= 0; k--) {
      const p = s.pts[k];
      ctx.lineTo(p.x + p.w / 2, p.y);
    }
    ctx.closePath();
  };

  const drawSlashes = (
    ctx: CanvasRenderingContext2D,
    E: typeof eng.current,
    t: number,
    baseAlpha: number,
    glow: string
  ) => {
    E.slashes.forEach((s, i) => {
      const p = clamp01((t - i * LEAVE_SLASH_STAG) / LEAVE_SLASH_DUR);
      if (p <= 0) return;
      const e = snappy.current(p);
      // glow bed
      ctx.save();
      ctx.fillStyle = glow;
      ctx.globalAlpha = 0.28 * baseAlpha;
      traceSlash(ctx, { ...s, pts: s.pts.map((q) => ({ ...q, w: q.w * 2.4 })) }, e);
      ctx.fill();
      ctx.restore();
      // hot core
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.95 * baseAlpha;
      traceSlash(ctx, s, e);
      ctx.fill();
      ctx.restore();
    });
  };

  // ---------- frames ----------
  const frameLeave = (
    E: typeof eng.current,
    ctx: CanvasRenderingContext2D,
    t: number
  ) => {
    withFrame(E, ctx, (hw, hh) => {
      // theme flood behind a serrated front
      const fp = clamp01((t - LEAVE_FLOOD_START) / LEAVE_FLOOD_DUR);
      if (fp > 0) {
        const F = -E.M + 2 * E.M * snappy.current(fp);
        ctx.save();
        ctx.fillStyle = E.theme;
        ctx.beginPath();
        const steps = 60;
        ctx.moveTo(-E.M - 100, -hh - 80);
        for (let k = 0; k <= steps; k++) {
          const y = -hh - 80 + ((2 * hh + 160) * k) / steps;
          ctx.lineTo(F + serr(y, E.H2), y);
        }
        ctx.lineTo(-E.M - 100, hh + 80);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // slashes rip first, on top
      drawSlashes(ctx, E, t, 1, E.theme);
    });
  };

  const frameEnter = (
    E: typeof eng.current,
    ctx: CanvasRenderingContext2D,
    t: number
  ) => {
    withFrame(E, ctx, (hw, hh) => {
      // theme recedes behind the same serrated front, same direction
      const fp = clamp01((t - ENTER_WIPE_START) / ENTER_WIPE_DUR);
      const F = -E.M + 2 * E.M * snappy.current(fp);
      ctx.save();
      ctx.fillStyle = E.theme;
      ctx.beginPath();
      const steps = 60;
      ctx.moveTo(E.M + 100, -hh - 80);
      for (let k = 0; k <= steps; k++) {
        const y = -hh - 80 + ((2 * hh + 160) * k) / steps;
        ctx.lineTo(F + serr(y, E.H2), y);
      }
      ctx.lineTo(E.M + 100, hh + 80);
      ctx.closePath();
      ctx.fill();
      // slash flash where the tear re-opens
      ctx.clip();
      const fa = 1 - clamp01(t / ENTER_SLASH_FLASH);
      if (fa > 0) drawSlashes(ctx, E, 10, 0.5 * fa, "#ffffff");
      ctx.restore();
    });
  };

  // ---------- driver ----------
  const stopLoop = (E: typeof eng.current) => {
    if (E.raf) cancelAnimationFrame(E.raf);
    E.raf = 0;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const later = (E: typeof eng.current, fn: () => void, ms: number) => {
    E.timers.push(window.setTimeout(fn, ms));
  };
  const clearTimers = (E: typeof eng.current) => {
    E.timers.forEach((x) => window.clearTimeout(x));
    E.timers = [];
  };
  const lockScroll = (on: boolean) => {
    document.documentElement.style.overflow = on ? "hidden" : "";
  };

  const finish = (E: typeof eng.current) => {
    stopLoop(E);
    clearTimers(E);
    E.pendingHref = null;
    E.mode = "idle";
    lockScroll(false);
    clearCanvas();
    setTick((v) => v + 1);
  };

  const startEnter = (E: typeof eng.current) => {
    E.mode = "enter";
    E.t0 = performance.now();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      finish(E);
      return;
    }
    stopLoop(E);
    const step = (now: number) => {
      if (E.mode !== "enter") return;
      const t = (now - E.t0) / 1000;
      frameEnter(E, ctx, t);
      if (t >= ENTER_END) {
        finish(E);
        return;
      }
      E.raf = requestAnimationFrame(step);
    };
    E.raf = requestAnimationFrame(step);
  };

  const startLeave = (E: typeof eng.current, href: string, theme: string) => {
    E.mode = "leave";
    E.theme = theme;
    E.pendingHref = href;
    E.done = false;
    E.t0 = performance.now();
    lockScroll(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      router.push(href);
      E.mode = "idle";
      lockScroll(false);
      return;
    }
    resize(E, canvas);
    stopLoop(E);
    const step = (now: number) => {
      if (E.mode !== "leave") return;
      const t = (now - E.t0) / 1000;
      frameLeave(E, ctx, t);
      if (t >= LEAVE_DONE_AT && !E.done) {
        E.done = true;
        E.mode = "hold";
        router.push(href);
        // safety: never trap the user behind cover
        later(E, () => {
          if (eng.current.mode === "hold") startEnter(eng.current);
        }, 3500);
        return;
      }
      E.raf = requestAnimationFrame(step);
    };
    E.raf = requestAnimationFrame(step);
  };

  // theme rule mirrors theirs (keyed off the page being LEFT):
  // media pages -> signature color, everything else -> black.
  // Ours: leaving home -> signal-blue, leaving info pages -> black.
  const themeForLeaving = (path: string) => (path === "/" ? BLUE : BLACK);

  // ---------- effects ----------
  // route swapped under cover -> wipe off
  const holding = eng.current.mode === "hold";
  useEffect(() => {
    const E = eng.current;
    if (E.mode === "hold" && E.pendingHref && pathname === E.pendingHref) {
      clearTimers(E);
      startEnter(E);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, holding]);

  // back/forward: route already swapped -> quick tear over it
  const firstPath = useRef<string | null>(null);
  useEffect(() => {
    const E = eng.current;
    if (firstPath.current === null) {
      firstPath.current = pathname;
      return;
    }
    if (E.mode === "idle" && pathname !== firstPath.current) {
      firstPath.current = pathname;
      // flash: fast cover then normal wipe (content already swapped)
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        E.theme = themeForLeaving(pathname === "/" ? "/x" : "/");
        E.mode = "leave";
        E.t0 = performance.now();
        lockScroll(true);
        resize(E, canvas);
        stopLoop(E);
        const step = (now: number) => {
          if (eng.current.mode !== "leave") return;
          const t = (now - eng.current.t0) / 1000;
          frameLeave(eng.current, ctx, Math.min(t * 2.2, LEAVE_DONE_AT));
          if (t * 2.2 >= LEAVE_DONE_AT) {
            eng.current.mode = "hold";
            startEnter(eng.current);
            return;
          }
          eng.current.raf = requestAnimationFrame(step);
        };
        E.raf = requestAnimationFrame(step);
      } else {
        firstPath.current = pathname;
      }
    } else {
      firstPath.current = pathname;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // intercept same-origin navigations: tear covers BEFORE the swap
  useEffect(() => {
    const E = eng.current;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) resize(E, canvas);
    }
    const onResize = () => {
      const c = canvasRef.current;
      if (c) resize(eng.current, c);
    };
    window.addEventListener("resize", onResize);

    const onClick = (ev: MouseEvent) => {
      if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const el = (ev.target as HTMLElement).closest?.("a");
      if (!el) return;
      const raw = el.getAttribute("href");
      if (!raw || raw.startsWith("#")) return;
      if (el.hasAttribute("download") || el.getAttribute("target") === "_blank") return;
      let url: URL;
      try {
        url = new URL(raw, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const next = url.pathname + url.search;
      const curr = window.location.pathname + window.location.search;
      if (next === curr) return; // same-page hash: smooth-scroll
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (eng.current.mode !== "idle") {
        ev.preventDefault();
        return;
      }
      ev.preventDefault();
      startLeave(eng.current, next + url.hash, themeForLeaving(window.location.pathname));
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("resize", onResize);
      stopLoop(eng.current);
      clearTimers(eng.current);
      lockScroll(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="claw-canvas-wrap" aria-hidden="true">
      <canvas ref={canvasRef} className="claw-canvas" role="presentation" />
    </div>
  );
}
