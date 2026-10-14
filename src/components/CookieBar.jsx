"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useBrowserValue } from "@/hooks/useBrowser";

const STORAGE_KEY = "sefgh-cookie-consent";

// localStorage throws outright in a private window or when site data is
// blocked. Then the bar stays hidden, silently, as it always has.
function consentAlreadyGiven() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return true;
  }
}

export default function CookieBar() {
  // Hidden on the server and while the page hydrates, as before.
  const given = useBrowserValue(consentAlreadyGiven, true);
  const [dismissed, setDismissed] = useState(false);
  const visible = !given && !dismissed;

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // Non-fatal: the bar reappears next visit.
    }
    setDismissed(true);
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
