import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Mono } from "next/font/google";
import Landing from "@/components/landing/Landing";

// The landing page's type (LANDING-001, chosen in the SEFGH design system):
// Space Mono for headlines, IBM Plex Sans for text, IBM Plex Mono for queries.
// Loaded here so only the landing page downloads them.
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

export default function Home() {
  return <Landing fontClassName={`${display.variable} ${body.variable} ${mono.variable}`} />;
}
