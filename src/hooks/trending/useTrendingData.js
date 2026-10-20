"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { fetchTrendingTopics } from "@/lib/trending-topics";
import { trendingEntries } from "@/lib/utils/trending/entries";

export function useTrendingData(activeTab, programmingLanguage, spokenLanguage, dateRange) {
  const [loading, setLoading] = useState(true);
  const [repositories, setRepositories] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [topicRepos, setTopicRepos] = useState([]);
  const [refreshRequest, setRefreshRequest] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const requests = useRef({ list: 0, topics: 0, refresh: 0, listController: null, topicsController: null });

  // Topic highlights have their own 30-day scope. A newer refresh wins over
  // an older one even when a fetch implementation ignores cancellation.
  const fetchTopics = useCallback(async () => {
    const state = requests.current;
    state.topicsController?.abort();
    const controller = new AbortController();
    state.topicsController = controller;
    const request = ++state.topics;
    const { repos, generatedAt } = await fetchTrendingTopics(fetch, { signal: controller.signal });
    if (request !== state.topics || controller.signal.aborted) return;
    setTopicRepos(repos);
    setLastRefresh(generatedAt);
  }, []);

  // true/false report this request's outcome; null means superseded or
  // canceled, so a stale refresh cannot display a toast for another view.
  const fetchCurrentList = useCallback(async () => {
    const state = requests.current;
    state.listController?.abort();
    const controller = new AbortController();
    state.listController = controller;
    const request = ++state.list;
    const current = () => request === state.list && !controller.signal.aborted;
    setLoading(true);
    try {
      const params = new URLSearchParams({ since: dateRange });
      let path = "/api/github/trending-developers";
      if (activeTab === "repositories") {
        path = "/api/github/trending";
        if (programmingLanguage !== "any") params.set("language", programmingLanguage);
        if (spokenLanguage !== "any") params.set("spokenLanguage", spokenLanguage);
      }
      const response = await fetch(`${path}?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const rows = trendingEntries(await response.json(), activeTab);
      if (rows === null) {
        throw new Error("the reply is not a list of entries");
      }
      if (!current()) return null;
      if (activeTab === "repositories") setRepositories(rows);
      else setDevelopers(rows);
      setLoadError(null);
      return true;
    } catch {
      if (!current()) return null;
      if (activeTab === "repositories") setRepositories([]);
      else setDevelopers([]);
      setLoadError(`Trending ${activeTab === "repositories" ? "repositories" : "developers"} could not be loaded right now. Please try again in a moment.`);
      return false;
    } finally {
      if (current()) setLoading(false);
    }
  }, [activeTab, programmingLanguage, spokenLanguage, dateRange]);

  const isRefreshing = refreshRequest?.load === fetchCurrentList;

  const handleRefreshTrending = async () => {
    const state = requests.current;
    const refresh = ++state.refresh;
    const listRequest = state.list + 1;
    setRefreshRequest({ load: fetchCurrentList });
    try {
      const [loaded] = await Promise.all([
        fetchCurrentList(),
        activeTab === "repositories" ? fetchTopics() : Promise.resolve(),
      ]);
      if (refresh !== state.refresh || listRequest !== state.list) return;
      if (loaded === true) toast.success("Trending updated");
      else if (loaded === false) toast.error("Could not refresh trending");
    } finally {
      if (refresh === state.refresh) setRefreshRequest(null);
    }
  };

  useEffect(() => {
    const state = requests.current;
    fetchTopics();
    return () => { state.topics++; state.refresh++; state.topicsController?.abort(); };
  }, [fetchTopics]);

  useEffect(() => {
    const state = requests.current;
    fetchCurrentList();
    return () => { state.list++; state.listController?.abort(); };
  }, [fetchCurrentList]);

  return { loading, repositories, developers, topicRepos, isRefreshing, lastRefresh, loadError, handleRefreshTrending };
}
