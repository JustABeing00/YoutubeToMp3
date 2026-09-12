"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Claw-tear page transition, in the spirit of mew.xyz.
 *
 * mew.xyz: 3 cat-claw slashes rip across the viewport, the page covers in
 * red-then-black, the route swaps underneath, and the panels wipe off the
 * other side. Same beat both directions.
 *
 * Our variation: signal-blue (#0099ff) instead of red — blue is already this
 * site's signal color (links, focus rings, cursor lines), so the tear feels
 * native instead of introducing a new chromatic accent.
 *
 * Timing mirrors their motion language (expo-out .19,1,.22,1; ~.7s sweeps):
 * cover 700ms + 110ms stagger, short hold for the route swap, 700ms reveal.
 * Total ≈ 1.6s. Tweak the constants below to retime in one place.
 */
export const CLAW_TIMING = {
  COVER_MS: 700,
  STAGGER_MS: 110,
  HOLD_MS: 150,
  REVEAL_MS: 700,
} as const;

type Phase = "idle" | "covering" | "holding" | "revealing";

export function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const pendingHref = useRef<string | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const timers = useRef<number[]>([]);

  phaseRef.current = phase;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const lockScroll = (on: boolean) => {
    document.documentElement.style.overflow = on ? "hidden" : "";
  };

  const finish = () => {
    clearTimers();
    pendingHref.current = null;
    lockScroll(false);
    setPhase("idle");
  };

  const reveal = () => {
    setPhase("revealing");
    later(finish, CLAW_TIMING.REVEAL_MS + CLAW_TIMING.STAGGER_MS + 60);
  };

  const go = (href: string) => {
    pendingHref.current = href;
    lockScroll(true);
    setPhase("covering");
    // At full cover, swap the route underneath the tear.
    later(() => {
      router.push(href);
      setPhase("holding");
      // Safety: if the route never swaps (error / same page), don't trap the user.
      later(() => {
        if (phaseRef.current === "holding") reveal();
      }, 3000);
    }, CLAW_TIMING.COVER_MS + CLAW_TIMING.STAGGER_MS + CLAW_TIMING.HOLD_MS);
  };

  // Route swapped under cover → wipe the tear off.
  const holdingRef = phase === "holding";
  useEffect(() => {
    if (holdingRef && pendingHref.current && pathname === pendingHref.current) {
      reveal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, holdingRef]);

  // Back/forward buttons: the route already swapped — flash the tear over it.
  const firstPath = useRef<string | null>(null);
  useEffect(() => {
    if (firstPath.current === null) {
      firstPath.current = pathname;
      return;
    }
    if (phaseRef.current === "idle" && pathname !== firstPath.current) {
      firstPath.current = pathname;
      lockScroll(true);
      setPhase("covering");
      later(() => {
        setPhase("revealing");
        later(finish, CLAW_TIMING.REVEAL_MS + CLAW_TIMING.STAGGER_MS + 60);
      }, 380);
    } else {
      firstPath.current = pathname;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Intercept same-origin navigations so the tear covers BEFORE the swap.
  useEffect(() => {
    const reduced = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const el = (e.target as HTMLElement).closest?.("a");
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
      // Same-page hash (e.g. #converter): let the browser smooth-scroll.
      if (next === curr) return;
      if (reduced() || phaseRef.current !== "idle") {
        if (phaseRef.current !== "idle") e.preventDefault();
        return;
      }
      e.preventDefault();
      go(next + url.hash);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
      lockScroll(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const active = phase !== "idle";

  return (
    <div className="claw-overlay" data-phase={phase} data-active={active} aria-hidden="true">
      <div className="claw-layer claw-blue" />
      <div className="claw-layer claw-black" />
    </div>
  );
}
