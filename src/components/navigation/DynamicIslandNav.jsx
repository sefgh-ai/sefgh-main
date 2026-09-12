"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Sparkles,
  TrendingUp,
  Code2,
  Activity,
  Download,
  BookOpen,
  Code,
  PenSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/chat", label: "Chat", icon: Sparkles },
  { href: "/playground", label: "Play", icon: Code2 },
  { href: "/trending", label: "Trend", icon: TrendingUp },
  { href: "/download", label: "Downloads", icon: Download },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/api-reference", label: "API", icon: Code },
  { href: "/blog", label: "Blog", icon: PenSquare },
  { href: "/status", label: "Status", icon: Activity },
];

export function DynamicIslandNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop floating island */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] hidden sm:flex">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-lg shadow-black/30 px-2 py-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-slate-300 transition-all",
                  active
                    ? "bg-blue-500/20 text-white border border-blue-500/40 shadow-inner shadow-blue-900/40"
                    : "hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline-block">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile scrollable bar */}
      <div className="sm:hidden sticky top-0 z-[60] bg-slate-950/95 backdrop-blur border-b border-slate-800 px-3 py-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm whitespace-nowrap",
                  active
                    ? "bg-blue-500/20 text-white border border-blue-500/40"
                    : "bg-slate-900/60 text-slate-200 border border-slate-800"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
