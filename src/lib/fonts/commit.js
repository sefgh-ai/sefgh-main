import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Mono } from "next/font/google";

// The "Commit" direction's type (SEFGH design system): Space Mono for
// headlines, IBM Plex Sans for text, IBM Plex Mono for queries and code.
// Shared by the pages already redesigned (landing LANDING-001, home HOME-001)
// and loaded only by them, through the CSS variables below.
const display = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-landing-display",
  display: "swap",
});
const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-landing-body",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-landing-mono",
  display: "swap",
});

export const commitFontClassName = `${display.variable} ${body.variable} ${mono.variable}`;
