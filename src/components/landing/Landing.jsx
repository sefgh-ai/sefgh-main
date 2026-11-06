"use client";

import { useRef } from "react";
import LandingHero from "./LandingHero";
import { LandingCta, LandingFeatures } from "./LandingSections";
import LandingFooter from "./LandingFooter";
import ContributionRain from "./ContributionRain";
import styles from "./landing.module.css";

/**
 * The landing page (LANDING-001). It is always dark: the `dark` class scopes
 * the site's shadcn tokens to dark for shared pieces such as the language
 * dropdown, and landing.module.css adds the page's own GitHub-dark palette.
 *
 * Hero, features and CTA share one surface with no dividing lines, and one
 * contribution rain falls behind all three. The canvas is sticky (one
 * viewport tall, pulled out of the flow with a negative margin), and the rain
 * collapses where this surface ends, so it fades into the footer without a line.
 */
export default function Landing({ fontClassName = "" }) {
  const surface = useRef(null);

  return (
    // overflow-x-clip, not -hidden: hidden would make <main> a second scroll
    // container inside PageWrapper's, and back-to-top would scroll the wrong box.
    <main className={`dark relative min-h-screen shrink-0 overflow-x-clip ${styles.root} ${fontClassName}`}>
      <div ref={surface} className="relative">
        <div className={`pointer-events-none absolute inset-0 ${styles.emptyGrid}`} aria-hidden="true" />
        <div className="pointer-events-none sticky top-0 z-0 -mb-[100vh] h-screen" aria-hidden="true">
          <ContributionRain floorRef={surface} className="h-full w-full opacity-75" />
        </div>
        <div className="relative z-10">
          <LandingHero />
          <LandingFeatures />
          <LandingCta />
        </div>
      </div>
      <LandingFooter />
    </main>
  );
}
