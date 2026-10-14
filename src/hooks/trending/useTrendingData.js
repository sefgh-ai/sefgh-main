"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getAllTrendingRepos,
  isTrendingDataStale,
  getLastRefreshTime,
  TRENDING_TOPICS,
} from "@/lib/trending";
import { getLanguageColor } from "@/lib/utils/trending/trendingHelpers";
import { starsPerDay, heatLevel } from "@/lib/utils/trending/trendingMeasure";

export function useTrendingData(
  activeTab,
  programmingLanguage,
  spokenLanguage,
  dateRange
) {
  const [loading, setLoading] = useState(true);
  const [repositories, setRepositories] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [customTrendingData, setCustomTrendingData] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [isDataStale, setIsDataStale] = useState(false);
  // Set when a list could not be loaded. The page says so; it used to show
  // made-up repositories and developers instead (bug register R-020).
  const [loadError, setLoadError] = useState(null);

  // Fetch custom curated trending data
  const fetchCustomTrendingData = async () => {
    try {
      const data = await getAllTrendingRepos();
      setCustomTrendingData(data);
    } catch (error) {
      console.error("Error fetching custom trending:", error);
    }
  };

  // Check if data needs refresh
  const checkDataFreshness = async () => {
    try {
      const stale = await isTrendingDataStale();
      setIsDataStale(stale);

      const lastTime = await getLastRefreshTime();
      setLastRefresh(lastTime);
    } catch (error) {
      console.error("Error checking data freshness:", error);
    }
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
        fetchCustomTrendingData(),
        checkDataFreshness(),
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

  // Get custom trending repos from Supabase data
  const getCustomTrendingRepos = () => {
    const allRepos = [];

    Object.keys(customTrendingData).forEach((topicId) => {
      const topic = TRENDING_TOPICS.find((t) => t.id === topicId);
      const topicRepos = customTrendingData[topicId] || [];

      topicRepos.forEach((item) => {
        const repo = item.repo_data;
        allRepos.push({
          id: item.id,
          author: repo.owner?.login || "unknown",
          name: repo.name,
          description: repo.description || "No description available",
          language: repo.language || "Unknown",
          languageColor: getLanguageColor(repo.language),
          stars: repo.stargazers_count || 0,
          forks: repo.forks_count || 0,
          starsPerDay: starsPerDay(repo.stargazers_count, repo.created_at),
          contributors: repo.owner?.login
            ? [{ avatar: repo.owner.avatar_url, name: repo.owner.login }]
            : [],
          heatLevel: heatLevel(starsPerDay(repo.stargazers_count, repo.created_at)),
          trending: true,
          topic: topic?.name || topicId,
          topicIcon: topic?.icon || "🔥",
        });
      });
    });

    return allRepos;
  };

  // Initialize data
  useEffect(() => {
    fetchCustomTrendingData();
    checkDataFreshness();
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
    customTrendingData,
    isRefreshing,
    lastRefresh,
    isDataStale,
    loadError,
    handleRefreshTrending,
    getCustomTrendingRepos,
  };
}
