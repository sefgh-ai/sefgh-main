"use client";

import { useEffect, useState, useMemo } from "react";
import { TrendingUp, Search, Users, Database } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SearchStats() {
  const [stats, setStats] = useState({
    repos_indexed: 0,
    total_searches: 0,
    registered_users: 0,
  });
  const [animated, setAnimated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Memoize supabase client to prevent recreation
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase
          .from("platform_stats")
          .select("stat_key, stat_value");

        if (error) throw error;

        const statsMap = {};
        data?.forEach((item) => {
          statsMap[item.stat_key] = item.stat_value;
        });
        setStats(statsMap);
      } catch (error) {
        console.error("Failed to fetch platform stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    // Trigger animation after mount
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, [supabase]);

  const formatNumber = (num) => {
    if (!num) return "0";
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const statItems = [
    {
      icon: Database,
      value: formatNumber(stats.repos_indexed),
      label: "Repos Indexed",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Search,
      value: formatNumber(stats.total_searches),
      label: "Searches",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      icon: Users,
      value: formatNumber(stats.registered_users),
      label: "Users",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: TrendingUp,
      value: "99.9%",
      label: "Uptime",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-4 mb-6">
      {statItems.map((stat, index) => (
        <div
          key={stat.label}
          className={`flex items-center gap-3 px-4 py-2 rounded-xl glass-premium border border-white/5 transition-all duration-500 ${
            animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: `${index * 100}ms` }}
        >
          <div className={`p-2 rounded-lg ${stat.bgColor}`}>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <div className="flex flex-col">
            <span className={`text-lg font-bold ${stat.color}`}>
              {stat.value}
            </span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
