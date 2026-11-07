"use client";

import { useCallback, useSyncExternalStore } from "react";

// A small string preference kept in localStorage (HOME-001: sidebar expanded
// or not, the Continue / Sharpen switch). useSyncExternalStore keeps the
// server render on `fallback` and switches to the stored value on the client
// without a setState-in-effect or a hydration mismatch.

const EVENT = "sefgh-stored-choice";

function subscribe(onChange) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function readKey(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Returns [storedValue | null, set]. `null` means the user never chose. */
export function useStoredChoice(key) {
  const value = useSyncExternalStore(
    subscribe,
    () => readKey(key),
    () => null
  );
  const set = useCallback(
    (next) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Storage blocked: the choice lasts until the page reloads at most.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key]
  );
  return [value, set];
}
