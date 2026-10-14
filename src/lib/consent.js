"use client";

import { useSyncExternalStore } from "react";

/**
 * The visitor's cookie choice (bug register R-055, the owner's choice of
 * 2026-10-14): Google Analytics loads only after "accepted".
 *
 * Values: "accepted", "declined", "" (not answered yet), or "unavailable"
 * when the browser blocks storage, which is treated as no consent. The old
 * single "Got it" button stored "accepted", so visitors who pressed it are
 * not asked again.
 */
export const CONSENT_KEY = "sefgh-cookie-consent";
const CONSENT_EVENT = "sefgh-consent-change";

export function readConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) ?? "";
  } catch {
    return "unavailable";
  }
}

export function saveConsent(value) {
  try {
    if (value) localStorage.setItem(CONSENT_KEY, value);
    else localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Non-fatal: the choice holds for this page only.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

// A choice made in this tab announces itself; one made in another tab
// arrives as a storage event.
export function subscribeConsent(onChange) {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The current choice. "server" on the server and while the page hydrates,
 * so neither the bar nor any analytics appears before the browser is read.
 */
export function useConsent() {
  return useSyncExternalStore(subscribeConsent, readConsent, () => "server");
}
