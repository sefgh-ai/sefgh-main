"use client";

import { Button } from "@/components/ui/button";
import { saveConsent, useConsent } from "@/lib/consent";

// Shown until the visitor chooses (bug register R-055). Google Analytics
// loads only after "Accept"; see src/components/GoogleAnalytics.jsx. Hidden
// on the server, while the page hydrates, and when the browser blocks
// storage, as before.
export default function CookieBar() {
  const consent = useConsent();
  if (consent !== "") return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-auto">
      <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-background/90 backdrop-blur-xl shadow-2xl shadow-black/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 text-sm text-foreground">
          May we use analytics cookies (Google Analytics) to see how SEFGH is
          used? The site works the same either way.
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="/cookie-policy">Cookie Policy</a>
          </Button>
          <Button variant="outline" size="sm" onClick={() => saveConsent("declined")}>
            Decline
          </Button>
          <Button size="sm" onClick={() => saveConsent("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
