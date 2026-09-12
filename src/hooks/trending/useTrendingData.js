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

      if (response.ok) {
        const data = await response.json();
        setRepositories(data);
      } else {
        setRepositories(getMockRepos());
      }
    } catch (error) {
      setRepositories(getMockRepos());
    }
  };

  // Fetch trending developers
  const fetchTrendingDevelopers = async () => {
    try {
      const response = await fetch(
        `/api/github/trending-developers?since=${dateRange}`
      );

      if (response.ok) {
        const data = await response.json();
        setDevelopers(data);
      } else {
        setDevelopers(getMockDevelopers());
      }
    } catch (error) {
      setDevelopers(getMockDevelopers());
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
          starsToday: Math.floor(Math.random() * 500) + 100,
          contributors: [
            { avatar: "👨‍💻", name: "user1" },
            { avatar: "👩‍💻", name: "user2" },
            { avatar: "🧑‍💻", name: "user3" },
          ],
          heatLevel: 3,
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
    handleRefreshTrending,
    getCustomTrendingRepos,
  };
}

// Mock data generators
function getMockRepos() {
  return [
    {
      id: 1,
      author: "666ghi",
      name: "BettaFish",
      description:
        "微模！人人可用的多Agent模拟分析助手，打破信息茧房，还原真相框架，预测未来走向，辅助决策！从0实现，不依赖任何框架。",
      language: "Python",
      languageColor: "#3572A5",
      stars: 17779,
      forks: 3465,
      starsToday: 3224,
      contributors: [
        { avatar: "👨‍💻", name: "user1" },
        { avatar: "👩‍💻", name: "user2" },
        { avatar: "🧑‍💻", name: "user3" },
      ],
      heatLevel: 3,
      trending: true,
    },
    {
      id: 2,
      author: "Skyvern-AI",
      name: "skyvern",
      description: "Automate browser based workflows with AI",
      language: "Python",
      languageColor: "#3572A5",
      stars: 16673,
      forks: 1414,
      starsToday: 878,
      contributors: [
        { avatar: "👨‍💻", name: "user1" },
        { avatar: "👩‍💻", name: "user2" },
      ],
      heatLevel: 3,
      trending: true,
    },
    {
      id: 3,
      author: "facebook",
      name: "react",
      description:
        "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
      language: "JavaScript",
      languageColor: "#f1e05a",
      stars: 228000,
      forks: 46700,
      starsToday: 245,
      contributors: [
        { avatar: "👨‍💻", name: "user1" },
        { avatar: "👩‍💻", name: "user2" },
        { avatar: "🧑‍💻", name: "user3" },
      ],
      heatLevel: 2,
      trending: true,
    },
  ];
}

function getMockDevelopers() {
  return [
    {
      id: 1,
      rank: 1,
      name: "John Developer",
      username: "@johndoe",
      avatar: "👨‍💻",
      popularRepo: {
        name: "awesome-project",
        description: "An awesome open source project",
      },
    },
    {
      id: 2,
      rank: 2,
      name: "Jane Coder",
      username: "@janecoder",
      avatar: "👩‍💻",
      popularRepo: {
        name: "cool-framework",
        description: "A modern JavaScript framework",
      },
    },
  ];
}
