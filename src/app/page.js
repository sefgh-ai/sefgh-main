import Landing from "@/components/landing/Landing";
import { commitFontClassName } from "@/lib/fonts/commit";

// The landing page (LANDING-001). Its fonts come from the shared Commit set,
// loaded only by the redesigned pages.
export default function Home() {
  return <Landing fontClassName={commitFontClassName} />;
}
