"use client";

import { Button } from "@/components/ui/button";
import { saveConsent, useConsent } from "@/lib/consent";

// Tells visitors that SEFGH uses analytics cookies and lets them opt out
// (bug register R-055, the owner's choice of 2026-10-14: analytics for
// everyone for now). Shown until the visitor answers; "Cookie settings" in
// the footer shows it again. Hidden on the server, while the page hydrates,
// and when the browser blocks storage.
export default function CookieBar() {
  const consent = useConsent();
  if (consent !== "") return null;

  return (
    <div role="region" aria-label="Cookie choices" className="fixed bottom-20 md:bottom-3 inset-x-3 z-40 mx-auto w-auto max-w-4xl max-h-[70dvh] overflow-y-auto rounded-2xl border border-border bg-background/90 backdrop-blur-xl shadow-2xl shadow-black/40">
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1 text-sm text-foreground">
          We use analytics cookies (Google Analytics) to see how SEFGH is used
          and make it better. You can opt out at any time.
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" asChild>
            <a href="/cookie-policy">Cookie Policy</a>
          </Button>
          <Button variant="outline" size="sm" onClick={() => saveConsent("declined")}>
            Opt out
          </Button>
          <Button size="sm" onClick={() => saveConsent("accepted")}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}

// For the footers: shows the bar again so the visitor can change the answer
// (bug register R-062).
export function CookieSettingsButton({ className }) {
  return (
    <button type="button" onClick={() => saveConsent("")} className={className}>
      Cookie settings
    </button>
  );
}
