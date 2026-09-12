"use client";

import { createElement, useEffect, useRef, type ReactNode } from "react";

/**
 * Word-by-word scroll reveal, faithful to blackshard.com.au's headline engine.
 *
 * Their exact recipe (decoded from their page chunk):
 *  1. Every `[data-reveal]` heading is pre-split into words — each word in an
 *     `inline-block` span at `opacity: 0, translateY(0.55em)`. Whitespace kept
 *     as raw text nodes so wrapping is untouched; nested elements (their cyan
 *     accent span) are preserved with their styling.
 *  2. One IntersectionObserver (`rootMargin: "0px 0px -15% 0px"`, threshold 0)
 *     fires once per heading as it scrolls in (never re-hides).
 *  3. GSAP `to(words, { opacity: 1, y: 0, ease: "power3.out",
 *     duration: 0.75, stagger: 0.05 })`.
 *
 * This port keeps every parameter identical, minus the GSAP dependency: the
 * same 0.55em rise, power3.out (≈ cubic-bezier(.215,.61,.355,1)), 0.75s,
 * 50ms stagger, and -15% trigger margin — driven by CSS transitions.
 * SSR renders plain text (no-JS safe); reduced-motion leaves text static.
 */
export function Reveal({
  as = "div",
  id,
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3" | "p" | "div" | "span";
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let words: HTMLElement[];
    if (el.dataset.revealApplied === "1") {
      words = Array.from(el.querySelectorAll<HTMLElement>("[data-w]"));
    } else {
      el.dataset.revealApplied = "1";
      words = [];
      const splitInto = (parent: Node, text: string) => {
        for (const part of text.split(/(\s+)/)) {
          if (part === "") continue;
          if (/^\s+$/.test(part)) {
            parent.appendChild(document.createTextNode(part));
            continue;
          }
          const s = document.createElement("span");
          s.setAttribute("data-w", "");
          s.textContent = part;
          parent.appendChild(s);
          words.push(s);
        }
      };
      // Reuse original child nodes so React-managed elements keep their
      // identity, listeners, and styling — text is split in place, in order.
      const kids = Array.from(el.childNodes);
      el.textContent = "";
      for (const k of kids) {
        if (k.nodeType === Node.TEXT_NODE) {
          splitInto(el, k.textContent ?? "");
        } else if (k instanceof HTMLElement) {
          const text = k.textContent ?? "";
          k.textContent = "";
          splitInto(k, text);
          el.appendChild(k);
        } else {
          el.appendChild(k);
        }
      }
      words.forEach((w, i) => w.style.setProperty("--wi", String(i)));
      if (words.length > 0) el.dataset.split = "1";
    }

    if (words.length === 0) return;
    if (el.classList.contains("is-in")) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          io.unobserve(en.target);
          (en.target as HTMLElement).classList.add("is-in");
        }
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return createElement(as, { ref, id, className, "data-reveal": "true" }, children);
}
