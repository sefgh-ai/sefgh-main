"use client";

import { Building2, Users, Code2, Boxes } from "lucide-react";

// Featured organizations/companies data
const FEATURED_ORGS = [
  {
    name: "Microsoft",
    logo: "M",
    type: "Enterprise",
    badge: "enterprise",
    stats: "2.4k repos • 156k followers",
    bgColor: "bg-gradient-to-br from-blue-600 to-blue-700",
  },
  {
    name: "Google",
    logo: "G",
    type: "Enterprise",
    badge: "enterprise",
    stats: "3.1k repos • 234k followers",
    bgColor: "bg-gradient-to-br from-red-500 via-yellow-500 to-green-500",
  },
  {
    name: "Meta",
    logo: "∞",
    type: "Enterprise",
    badge: "enterprise",
    stats: "1.8k repos • 189k followers",
    bgColor: "bg-gradient-to-br from-blue-500 to-indigo-600",
  },
  {
    name: "OpenAI",
    logo: "◎",
    type: "Enterprise",
    badge: "enterprise",
    stats: "128 repos • 89k followers",
    bgColor: "bg-gradient-to-br from-emerald-500 to-teal-600",
  },
  {
    name: "Vercel",
    logo: "▲",
    type: "Team",
    badge: "team",
    stats: "456 repos • 67k followers",
    bgColor: "bg-gradient-to-br from-slate-700 to-slate-900",
  },
  {
    name: "Netflix",
    logo: "N",
    type: "Enterprise",
    badge: "enterprise",
    stats: "892 repos • 45k followers",
    bgColor: "bg-gradient-to-br from-red-600 to-red-700",
  },
  {
    name: "Stripe",
    logo: "S",
    type: "Enterprise",
    badge: "enterprise",
    stats: "234 repos • 52k followers",
    bgColor: "bg-gradient-to-br from-indigo-500 to-purple-600",
  },
  {
    name: "Shopify",
    logo: "🛍",
    type: "Enterprise",
    badge: "enterprise",
    stats: "678 repos • 38k followers",
    bgColor: "bg-gradient-to-br from-green-500 to-emerald-600",
  },
  {
    name: "Airbnb",
    logo: "⌂",
    type: "Enterprise",
    badge: "enterprise",
    stats: "345 repos • 29k followers",
    bgColor: "bg-gradient-to-br from-rose-500 to-pink-600",
  },
  {
    name: "Uber",
    logo: "U",
    type: "Enterprise",
    badge: "enterprise",
    stats: "567 repos • 41k followers",
    bgColor: "bg-gradient-to-br from-slate-800 to-slate-900",
  },
  {
    name: "Discord",
    logo: "🎮",
    type: "Team",
    badge: "team",
    stats: "189 repos • 78k followers",
    bgColor: "bg-gradient-to-br from-indigo-500 to-indigo-700",
  },
  {
    name: "Spotify",
    logo: "♪",
    type: "Enterprise",
    badge: "enterprise",
    stats: "423 repos • 56k followers",
    bgColor: "bg-gradient-to-br from-green-500 to-green-600",
  },
];

function OrgCard({ org }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl hover:border-slate-600 hover:bg-slate-800/80 transition-all duration-300 cursor-pointer group min-w-[260px]">
      {/* Logo */}
      <div
        className={`w-10 h-10 ${org.bgColor} rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-105 transition-transform`}
      >
        {org.logo}
      </div>

      {/* Info */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-sm group-hover:text-blue-400 transition-colors">
            {org.name}
          </span>
          <span
            className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
              org.badge === "enterprise"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-slate-600/50 text-slate-300 border border-slate-500/30"
            }`}
          >
            {org.type}
          </span>
        </div>
        <span className="text-xs text-slate-400">{org.stats}</span>
      </div>
    </div>
  );
}

export default function LogoMarquee() {
  const duplicatedOrgs = [...FEATURED_ORGS, ...FEATURED_ORGS];

  return (
    <section className="relative py-12 sm:py-16 overflow-hidden">
      {/* Section Header */}
      <div className="text-center mb-8 sm:mb-10 px-4">
        <p className="text-sm uppercase tracking-widest text-slate-500 mb-2">
          Trusted by developers at
        </p>
        <h3 className="text-xl sm:text-2xl font-semibold text-white">
          World&apos;s Leading Tech Companies
        </h3>
      </div>

      {/* Gradient Overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

      {/* Scrolling Container */}
      <div className="overflow-hidden">
        <div className="flex gap-4 animate-marquee will-change-transform">
          {duplicatedOrgs.map((org, index) => (
            <OrgCard key={`${org.name}-${index}`} org={org} />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          width: max-content;
          animation: marquee 24s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Stats Row */}
      <div className="flex flex-wrap justify-center gap-6 sm:gap-12 mt-10 sm:mt-12 px-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Building2 className="w-4 h-4 text-blue-400" />
          <span className="text-sm">
            <span className="text-white font-semibold">500+</span> Organizations
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Code2 className="w-4 h-4 text-green-400" />
          <span className="text-sm">
            <span className="text-white font-semibold">50K+</span> Projects
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Users className="w-4 h-4 text-purple-400" />
          <span className="text-sm">
            <span className="text-white font-semibold">1M+</span> Developers
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Boxes className="w-4 h-4 text-orange-400" />
          <span className="text-sm">
            <span className="text-white font-semibold">10B+</span> Lines of Code
          </span>
        </div>
      </div>
    </section>
  );
}
