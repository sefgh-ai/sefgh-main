import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RepoView from "@/components/repo-page/RepoView";
import { commitFontClassName } from "@/lib/fonts/commit";
import RecordRepoVisit from "@/components/repo-details/RecordRepoVisit";
import { fetchRepoForPage } from "@/lib/repo/repoData";
import { fetchSefghData } from "@/lib/repo/sefghData";

export default async function RepoDetailsPage({ params }) {
  const resolvedParams = await params;
  const { owner } = resolvedParams;
  const repoName = resolvedParams["repo-name"];

  console.log("Loading repo page:", { owner, repoName });

  // Fetch GitHub repository data, from Go when github-public-repo is switched on
  const repoData = await fetchRepoForPage(owner, repoName);

  if (!repoData) {
    console.log("Repository not found:", `${owner}/${repoName}`);
    notFound();
  }

  // Fetch SEFGH-specific data, through Go (repo-page, profile; DATA-010)
  const supabase = await createClient();
  const sefghData = await fetchSefghData(supabase, `${owner}/${repoName}`);

  return (
    <>
      {/* HOME-001: remember the visit in this browser for Home's "Continue where you left off". */}
      <RecordRepoVisit
        name={`${owner}/${repoName}`}
        description={repoData.description || null}
        language={repoData.language || null}
      />
      {/* REPO-001: the redesigned page (the old RepoDetailsLayout stays in the repo until the clean-up). */}
      <RepoView
        repoData={repoData}
        sefghData={sefghData}
        owner={owner}
        repoName={repoName}
        fontClassName={commitFontClassName}
      />
    </>
  );
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { owner } = resolvedParams;
  const repoName = resolvedParams["repo-name"];
  const repoData = await fetchRepoForPage(owner, repoName);

  if (!repoData) {
    return {
      title: "Repository Not Found",
    };
  }

  return {
    title: `${owner}/${repoName} - SEFGH`,
    description:
      repoData.description || `Explore ${owner}/${repoName} on SEFGH`,
    openGraph: {
      title: `${owner}/${repoName}`,
      description: repoData.description,
      images: [repoData.owner.avatar_url],
    },
  };
}
