"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "sefgh-cookie-consent";

export default function CookieBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-1.5rem)] sm:w-auto">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-xl shadow-2xl shadow-black/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 text-sm text-slate-200">
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
