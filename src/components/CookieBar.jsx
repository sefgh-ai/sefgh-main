"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "sefgh-cookie-consent";

export default function CookieBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // localStorage throws outright in a private window or when site data is
    // blocked. Unwrapped, that error escapes the effect and takes the tree
    // down with it.
    let stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Treat unavailable storage as "not yet accepted" but stay silent.
      return;
    }
    if (!stored) setVisible(true);
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // Non-fatal: the bar reappears next visit.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-auto">
      <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-background/90 backdrop-blur-xl shadow-2xl shadow-black/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 text-sm text-foreground">
          We use cookies to improve your experience. Review our policies any time.
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/cookie-policy">Cookie Policy</a>
          </Button>
          <Button size="sm" onClick={accept}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
