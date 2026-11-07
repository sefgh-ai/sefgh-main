"use client";

import { useEffect, useRef } from "react";

/**
 * Pulls an element a little towards the pointer while it hovers, and lets it
 * spring back on leave. Only for a fine pointer and when motion is allowed;
 * the transition itself comes from the element's CSS.
 */
export default function useMagnetic(strength = 0.3) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ok =
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!ok) return undefined;

    const move = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - r.left - r.width / 2;
      const dy = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px) scale(1.04)`;
    };
    const leave = () => {
      el.style.transform = "";
    };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, [strength]);

  return ref;
}
