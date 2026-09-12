"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, Trash2, Search, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSearchHistory,
  deleteSearchHistoryItem,
} from "@/lib/supabase/search-history";

export function SearchHistoryDropdown({ isOpen, onSelect, onClose, inputRef }) {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const data = await getSearchHistory(user?.id, {
          limit: 10,
          source: "search",
        });
        setHistory(data || []);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen && user) {
      fetchHistory();
    }
  }, [isOpen, user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef?.current &&
        !inputRef.current.contains(event.target)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, inputRef]);

  const handleDelete = async (e, historyId) => {
    e.stopPropagation();
    try {
      await deleteSearchHistoryItem(historyId);
      setHistory((prev) => prev.filter((h) => h.id !== historyId));
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen || !user) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 w-full mt-2 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-premium overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Recent Searches
        </div>
        {history.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {history.length} searches
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          Loading...
        </div>
      ) : history.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No recent searches</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Your search history will appear here
          </p>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item.query)}
              className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/5 cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate group-hover:text-blue-400 transition-colors">
                    {item.query}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(item.created_at)}</span>
                    {item.results_count > 0 && (
                      <>
                        <span>•</span>
                        <span>
                          {item.results_count.toLocaleString()} results
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(e, item.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer with trending */}
      {history.length > 0 && (
        <div className="px-4 py-2 border-t border-white/10 bg-white/5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Tip: Press ↑↓ to navigate, Enter to select</span>
          </div>
        </div>
      )}
    </div>
  );
}
