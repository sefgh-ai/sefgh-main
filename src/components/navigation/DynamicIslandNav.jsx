"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MagnifyingGlassIcon,
  ChatCircleIcon,
  TrendUpIcon,
  CodeIcon,
  PulseIcon,
  DownloadSimpleIcon,
  BookOpenIcon,
  NotePencilIcon,
  BracketsCurlyIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/search", label: "Search", icon: MagnifyingGlassIcon },
  { href: "/chat", label: "Chat", icon: ChatCircleIcon },
  { href: "/playground", label: "Play", icon: CodeIcon },
  { href: "/trending", label: "Trend", icon: TrendUpIcon },
  { href: "/download", label: "Downloads", icon: DownloadSimpleIcon },
  { href: "/docs", label: "Docs", icon: BookOpenIcon },
  { href: "/api-reference", label: "API", icon: BracketsCurlyIcon },
  { href: "/blog", label: "Blog", icon: NotePencilIcon },
  { href: "/status", label: "Status", icon: PulseIcon },
];

export function DynamicIslandNav() {
  const pathname = usePathname();

  // Redesigned pages carry their own navigation, and the floating island
  // covered their headers: the landing page (LANDING-001) and Home's top bar
  // and rail (HOME-001).
  if (pathname === "/" || pathname === "/home") return null;

  return (
    <>
      {/* Desktop floating island */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-30 hidden sm:flex">
        <div className="flex items-center gap-1 rounded-full border border-border bg-background/80 backdrop-blur-xl shadow-lg shadow-black/30 px-2 py-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-all",
                  active
                    ? "bg-primary/20 text-white border border-blue-500/40 shadow-inner shadow-blue-900/40"
                    : "hover:bg-accent hover:text-foreground"
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
      <div className="sm:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-3 py-2">
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
                    ? "bg-primary/20 text-white border border-blue-500/40"
                    : "bg-card/60 text-foreground border border-border"
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
