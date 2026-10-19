"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchTrendingTopics } from "@/lib/trending-topics";

export function useTrendingData(
  activeTab,
  programmingLanguage,
  spokenLanguage,
  dateRange
) {
  const [loading, setLoading] = useState(true);
  const [repositories, setRepositories] = useState([]);
  const [developers, setDevelopers] = useState([]);
  // The topic sections' repositories, from /api/trending/topics.
  const [topicRepos, setTopicRepos] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  // Set when a list could not be loaded. The page says so; it used to show
  // made-up repositories and developers instead (bug register R-020).
  const [loadError, setLoadError] = useState(null);

  // The topic sections and when they were searched (TREND-001b). They used
  // to come from the trending_repos table, which nothing could fill, and the
  // page then always said the data was over three days old (R-100). Without
  // an answer there are no topic sections and no date.
  const fetchTopics = async () => {
    const { repos, generatedAt } = await fetchTrendingTopics();
    setTopicRepos(repos);
    setLastRefresh(generatedAt);
  };

  // Fetch trending repositories
  const fetchTrendingRepos = async () => {
    try {
      // Built with URLSearchParams so the "?" is never lost. Previously, when
      // programmingLanguage was "any" (the initial state) the URL came out as
      // "/api/github/trending&since=daily" -> 404 -> silent fall back to mocks.
      const params = new URLSearchParams({ since: dateRange });
      if (programmingLanguage !== "any") params.set("language", programmingLanguage);
      if (spokenLanguage !== "any") params.set("spokenLanguage", spokenLanguage);
      const response = await fetch(`/api/github/trending?${params}`);

      if (!response.ok) throw new Error(`status ${response.status}`);
      setRepositories(await response.json());
      setLoadError(null);
    } catch {
      setRepositories([]);
      setLoadError("Trending repositories could not be loaded right now. Please try again in a moment.");
    }
  };

  // Fetch trending developers
  const fetchTrendingDevelopers = async () => {
    try {
      const response = await fetch(
        `/api/github/trending-developers?since=${dateRange}`
      );

      if (!response.ok) throw new Error(`status ${response.status}`);
      setDevelopers(await response.json());
      setLoadError(null);
    } catch {
      setDevelopers([]);
      setLoadError("Trending developers could not be loaded right now. Please try again in a moment.");
    }
  };

  // Reload what this visitor is looking at.
  //
  // This used to POST /api/trending/refresh, which clears the shared
  // trending_repos table for every user and re-scrapes GitHub. That is a cron
  // job, not a button — it is now protected by CRON_SECRET.
  const handleRefreshTrending = async () => {
    setIsRefreshing(true);

    try {
      await Promise.all([
        fetchTrendingRepos(),
        fetchTrendingDevelopers(),
        fetchTopics(),
      ]);
      toast.success("Trending updated");
    } catch (error) {
      toast.error("Could not refresh trending", {
        description: error.message,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchTopics();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === "repositories") {
          await fetchTrendingRepos();
        } else {
          await fetchTrendingDevelopers();
        }
      } catch (error) {
        console.error("Error fetching trending data:", error);
        toast.error("Failed to load trending data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, programmingLanguage, spokenLanguage, dateRange]);

  return {
    loading,
    repositories,
    developers,
    topicRepos,
    isRefreshing,
    lastRefresh,
    loadError,
    handleRefreshTrending,
  };
}
