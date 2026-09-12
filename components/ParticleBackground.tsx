"use client";

import { useEffect, useRef } from "react";

/**
 * ParticleBackground — full-viewport fixed canvas network, in the spirit of
 * liveagecalculator.com with a Framer-dark variation:
 * - monochrome white dots + hairline links (brand stays monochrome on canvas)
 * - cursor link-lines + repulsion tinted accent-blue (#0099ff) — blue is the
 *   signal color, and the cursor is a live signal
 * - subtle per-particle twinkle on top of the slow drift + wobble
 *
 * Dark-only. Respects prefers-reduced-motion (single static frame),
 * pauses when the tab is hidden, caps DPR at 2.
 */
export function ParticleBackground() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let running = true;
    let w = 0;
    let h = 0;
    let LINK_DIST = 130;
    let MOUSE_RADIUS = 140;
    const DPR_CAP = 2;

    const mouse = { tx: -9999, ty: -9999, sx: -9999, sy: -9999, active: false };
    let reducedMotion = false;
    try {
      reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* ignore */
    }

    interface P {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      phase: number;
      oscSpeed: number;
      oscAmp: number;
      twinkleSpeed: number;
      twinklePhase: number;
    }
    let particles: P[] = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      LINK_DIST = w < 640 ? 100 : 130;
      MOUSE_RADIUS = w < 640 ? 110 : 140;
    }

    function countForViewport() {
      const area = w * h;
      let n = Math.round(area / 16000);
      if (w < 640) n = Math.min(n, 32);
      if (n < 24) n = 24;
      if (n > 78) n = 78;
      return n;
    }

    function random(min: number, max: number) {
      return min + Math.random() * (max - min);
    }

    function makeParticle(): P {
      const angle = Math.random() * Math.PI * 2;
      const speed = random(0.12, 0.34);
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: random(1, 2.2),
        phase: Math.random() * Math.PI * 2,
        oscSpeed: random(0.004, 0.012),
        oscAmp: random(0.08, 0.22),
        twinkleSpeed: random(0.0006, 0.0016),
        twinklePhase: Math.random() * Math.PI * 2,
      };
    }

    function initParticles() {
      particles = [];
      const n = countForViewport();
      for (let i = 0; i < n; i++) particles.push(makeParticle());
    }

    function step(dt: number, t: number) {
      mouse.sx += (mouse.tx - mouse.sx) * 0.08 * dt;
      mouse.sy += (mouse.ty - mouse.sy) * 0.08 * dt;
      if (!mouse.active) {
        mouse.sx = -9999;
        mouse.sy = -9999;
      }

      for (const p of particles) {
        const wobbleX = Math.cos(t * p.oscSpeed + p.phase) * p.oscAmp;
        const wobbleY = Math.sin(t * p.oscSpeed * 0.9 + p.phase) * p.oscAmp;
        p.x += (p.vx + wobbleX) * dt;
        p.y += (p.vy + wobbleY) * dt;

        if (mouse.active) {
          const mdx = p.x - mouse.sx;
          const mdy = p.y - mouse.sy;
          const md2 = mdx * mdx + mdy * mdy;
          if (md2 < MOUSE_RADIUS * MOUSE_RADIUS && md2 > 0.04) {
            const md = Math.sqrt(md2);
            const force = ((MOUSE_RADIUS - md) / MOUSE_RADIUS) * 0.55 * dt;
            p.x += (mdx / md) * force;
            p.y += (mdy / md) * force;
          }
        }

        const m = 12;
        if (p.x < -m) p.x = w + m;
        else if (p.x > w + m) p.x = -m;
        if (p.y < -m) p.y = h + m;
        else if (p.y > h + m) p.y = -m;
      }
    }

    function draw(now: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      const maxLineAlpha = 0.22;
      const link2 = LINK_DIST * LINK_DIST;

      // Thin connecting lines between nearby particles (monochrome).
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < link2) {
            const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * maxLineAlpha;
            if (alpha <= 0.004) continue;
            ctx.strokeStyle = `rgba(237,237,237,${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }

      // Accent-blue lines from particles to the cursor (signal variation).
      if (mouse.active && mouse.sx > -500 && mouse.sy > -500) {
        const mr2 = MOUSE_RADIUS * MOUSE_RADIUS;
        for (const p of particles) {
          const mx = p.x - mouse.sx;
          const my = p.y - mouse.sy;
          const mdd2 = mx * mx + my * my;
          if (mdd2 < mr2) {
            const ma = (1 - Math.sqrt(mdd2) / MOUSE_RADIUS) * 0.35;
            if (ma <= 0.004) continue;
            ctx.strokeStyle = `rgba(0,153,255,${ma.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.sx, mouse.sy);
            ctx.stroke();
          }
        }
      }

      // Dots with a gentle twinkle (variation over the reference).
      for (const p of particles) {
        const tw = 0.72 + 0.28 * Math.sin(now * p.twinkleSpeed + p.twinklePhase);
        ctx.fillStyle = `rgba(237,237,237,${(0.55 * tw).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    let last = 0;
    function frame(now: number) {
      if (!running) return;
      if (!last) last = now;
      let dt = (now - last) / 16.666;
      last = now;
      if (dt > 2) dt = 2;
      if (dt < 0.25) dt = 0.25;
      step(dt, now / 1000);
      draw(now);
      rafId = requestAnimationFrame(frame);
    }

    function onPointerMove(e: PointerEvent) {
      const cx = e.clientX;
      const cy = e.clientY;
      if (typeof cx !== "number" || typeof cy !== "number") return;
      if (!mouse.active) {
        mouse.sx = cx;
        mouse.sy = cy;
      }
      mouse.tx = cx;
      mouse.ty = cy;
      mouse.active = true;
    }

    function onTouchMove(e: TouchEvent) {
      const t0 = e.touches?.[0];
      if (!t0) return;
      if (!mouse.active) {
        mouse.sx = t0.clientX;
        mouse.sy = t0.clientY;
      }
      mouse.tx = t0.clientX;
      mouse.ty = t0.clientY;
      mouse.active = true;
    }

    function onPointerLeave() {
      mouse.active = false;
      mouse.tx = -9999;
      mouse.ty = -9999;
    }

    function onVisibility() {
      if (document.hidden) {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        last = 0;
      } else if (!reducedMotion && !rafId) {
        running = true;
        rafId = requestAnimationFrame(frame);
      }
    }

    let resizeTimer = 0;
    function onResize() {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        initParticles();
        if (reducedMotion) draw(0);
      }, 150);
    }

    resize();
    initParticles();

    if (reducedMotion) {
      draw(0);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("mouseleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);

    rafId = requestAnimationFrame(frame);

    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (resizeTimer) window.clearTimeout(resizeTimer);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("mouseleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="particle-bg" aria-hidden="true" role="presentation" />;
}
