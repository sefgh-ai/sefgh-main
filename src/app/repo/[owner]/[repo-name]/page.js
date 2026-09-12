import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RepoDetailsLayout from "@/components/repo-details/RepoDetailsLayout";
import { fetchRepoFromGitHub } from "@/lib/repo/repoData";
import { fetchSefghData } from "@/lib/repo/sefghData";

export default async function RepoDetailsPage({ params }) {
  const resolvedParams = await params;
  const { owner } = resolvedParams;
  const repoName = resolvedParams["repo-name"];

  console.log("Loading repo page:", { owner, repoName });

  // Fetch GitHub repository data
  const repoData = await fetchRepoFromGitHub(owner, repoName);

  if (!repoData) {
    console.log("Repository not found:", `${owner}/${repoName}`);
    notFound();
  }

  // Fetch SEFGH-specific data
  const supabase = await createClient();
  const sefghData = await fetchSefghData(supabase, `${owner}/${repoName}`);

  return (
    <RepoDetailsLayout
      repoData={repoData}
      sefghData={sefghData}
      owner={owner}
      repoName={repoName}
    />
  );
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { owner } = resolvedParams;
  const repoName = resolvedParams["repo-name"];
  const repoData = await fetchRepoFromGitHub(owner, repoName);

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
