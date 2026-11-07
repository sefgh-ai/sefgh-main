import TrendingView from "@/components/trending-page/TrendingView";
import { commitFontClassName } from "@/lib/fonts/commit";

// Trending (TRENDING-001): the redesigned page. A server component so the
// shared Commit fonts load here; everything else is in TrendingView. The old
// TrendingFilters / TrendingRepositoryCard / TrendingDeveloperCard /
// EditorsChoice components stay in the repo until the redesign clean-up.
export default function TrendingPage() {
  return <TrendingView fontClassName={commitFontClassName} />;
}
