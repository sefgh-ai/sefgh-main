"use client";

import { useCallback, useSyncExternalStore } from "react";

// Nothing announces these values changing; they are read again on each render.
const subscribeToNothing = () => () => {};

/**
 * A value only the browser can know, such as one kept in localStorage.
 *
 * On the server, and in the first render in the browser while the page
 * hydrates, it is `serverValue`, so the two agree. React then renders again
 * with `read()`. This replaces `useState(x)` plus an effect that calls
 * `setState` straight away, which renders everything twice and is what the
 * `react-hooks/set-state-in-effect` lint rule reports (bug register R-043).
 *
 * `read` must not throw: wrap localStorage in try/catch, because it throws in
 * a private window or when site data is blocked.
 */
export function useBrowserValue(read, serverValue) {
  return useSyncExternalStore(subscribeToNothing, read, () => serverValue);
}

/** true once the page runs in the browser; false on the server and while hydrating. */
export function useIsClient() {
  return useBrowserValue(() => true, false);
}

/** Whether a CSS media query matches, kept up to date as it changes. */
export function useMediaQuery(query, serverValue = false) {
  const subscribe = useCallback(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener?.("change", onChange);
      return () => media.removeEventListener?.("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}
