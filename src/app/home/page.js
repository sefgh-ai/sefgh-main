import HomeView from "@/components/home/HomeView";
import { commitFontClassName } from "@/lib/fonts/commit";

// Home (HOME-001): the redesigned signed-in feed. A server component only so
// the shared Commit fonts load here; everything else is in HomeView.
export default function HomePage() {
  return <HomeView fontClassName={commitFontClassName} />;
}
