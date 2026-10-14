"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useConsent } from "@/lib/consent";

const MEASUREMENT_ID = "G-3J37CNB3YE";

// Google Analytics for every visitor who has not opted out (the owner's
// choice of 2026-10-14; bug register R-055). It loads once the page is in
// the browser, never during server rendering. Opting out stops it at once
// through Google's own switch, and on later pages it is not loaded at all.
// Do Not Track is still honoured.
export default function GoogleAnalytics() {
  const consent = useConsent();
  const optedOut = consent === "declined";

  useEffect(() => {
    window[`ga-disable-${MEASUREMENT_ID}`] = optedOut;
  }, [optedOut]);

  if (consent === "server" || optedOut) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`} strategy="lazyOnload" />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          if (navigator?.doNotTrack === '1') {
            console.info('GA disabled by DNT');
          } else {
            const runGA = () => {
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${MEASUREMENT_ID}');
            };
            if ('requestIdleCallback' in window) {
              window.requestIdleCallback(runGA, { timeout: 2000 });
            } else {
              setTimeout(runGA, 1200);
            }
          }
        `}
      </Script>
    </>
  );
}
