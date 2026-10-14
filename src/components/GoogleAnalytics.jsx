"use client";

import Script from "next/script";
import { useConsent } from "@/lib/consent";

const MEASUREMENT_ID = "G-3J37CNB3YE";

// Google Analytics, loaded only once the visitor has accepted analytics
// cookies in the cookie bar (bug register R-055). It used to load on every
// page for everyone, before any choice. Do Not Track is still honoured.
export default function GoogleAnalytics() {
  const consent = useConsent();
  if (consent !== "accepted") return null;

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
