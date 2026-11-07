import { Suspense } from "react";
import SearchView from "@/components/search-page/SearchView";
import { PageLoadingSpinner } from "@/components/shared/LoadingSpinner";
import { commitFontClassName } from "@/lib/fonts/commit";

// Search (SEARCH-001): the redesigned search page. A server component so the
// shared Commit fonts load here; useSearchParams in the view needs Suspense.
export default function SearchPage() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <SearchView fontClassName={commitFontClassName} />
    </Suspense>
  );
}
