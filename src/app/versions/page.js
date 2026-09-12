"use client";

import Link from "next/link";
import AppFooter from "@/components/ui/app-footer";
import {
  Check,
  Clock,
  Sparkles,
  Zap,
  Shield,
  Globe,
  Code,
  Rocket,
} from "lucide-react";

export default function VersionsPage() {
  const versions = [
    {
      version: "3.0.0",
      codename: "Nova",
      date: "January 2026",
      status: "current",
      highlights: [
        "AI-powered semantic search with GPT-4 integration",
        "Real-time repository analytics dashboard",
        "Multi-language code understanding",
        "Advanced filtering with natural language queries",
      ],
      icon: Sparkles,
    },
    {
      version: "2.5.0",
      codename: "Aurora",
      date: "October 2025",
      status: "stable",
      highlights: [
        "Introduced AI Chat Assistant",
        "Repository comparison tools",
        "Enhanced trending algorithms",
        "Dark mode improvements",
      ],
      icon: Zap,
    },
    {
      version: "2.0.0",
      codename: "Horizon",
      date: "June 2025",
      status: "legacy",
      highlights: [
        "Complete UI redesign",
        "API Playground launch",
        "User authentication system",
        "Search history and starred repos",
      ],
      icon: Rocket,
    },
    {
      version: "1.5.0",
      codename: "Pulse",
      date: "February 2025",
      status: "legacy",
      highlights: [
        "Advanced search filters",
        "Language-based filtering",
        "Star count sorting",
        "Pagination improvements",
      ],
      icon: Code,
    },
    {
      version: "1.0.0",
      codename: "Genesis",
      date: "September 2024",
      status: "deprecated",
      highlights: [
        "Initial public release",
        "Basic GitHub search functionality",
        "Repository cards with key metrics",
        "Simple sorting options",
      ],
      icon: Globe,
    },
  ];

  const roadmap = [
    {
      quarter: "Q1 2026",
      features: [
        "Code snippet search within repositories",
        "Team collaboration features",
        "Custom search presets",
      ],
    },
    {
      quarter: "Q2 2026",
      features: [
        "Browser extension for GitHub",
        "IDE integrations (VS Code, JetBrains)",
        "Webhook notifications",
      ],
    },
    {
      quarter: "Q3 2026",
      features: [
        "Self-hosted enterprise edition",
        "Advanced analytics API",
        "Custom AI model training",
      ],
    },
  ];

  const getStatusBadge = (status) => {
    const styles = {
      current: "bg-green-500/10 text-green-400 border-green-500/20",
      stable: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      legacy: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      deprecated: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return styles[status] || styles.legacy;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            SEFGH<span className="text-blue-500">-AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              href="/search"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Search
            </Link>
            <Link
              href="/about"
              className="text-slate-400 hover:text-white transition-colors"
            >
              About
            </Link>
            <Link href="/versions" className="text-white transition-colors">
              Versions
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Version <span className="text-blue-500">History</span>
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed max-w-3xl mx-auto">
            Track our journey of continuous improvement. See what&apos;s new,
            what&apos;s changed, and what&apos;s coming next to SEFGH-AI.
          </p>
        </div>
      </section>

      {/* Current Version Highlight */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Version 3.0.0 &ldquo;Nova&rdquo;
                </h2>
                <p className="text-slate-400">Current Release • January 2026</p>
              </div>
            </div>
            <p className="text-slate-300 mb-6">
              Our most powerful release yet, featuring AI-powered semantic
              search that understands developer intent and surfaces the most
              relevant repositories instantly.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/search"
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium rounded-lg transition-all"
              >
                Try It Now
              </Link>
              <a
                href="#changelog"
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-all border border-slate-700"
              >
                View Changelog
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Version Timeline */}
      <section
        id="changelog"
        className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Release History
          </h2>

          <div className="space-y-6">
            {versions.map((release, index) => (
              <div
                key={release.version}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500/30 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        release.status === "current"
                          ? "bg-gradient-to-br from-blue-500 to-purple-600"
                          : "bg-slate-700"
                      }`}
                    >
                      <release.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        Version {release.version}
                        <span className="text-slate-400 font-normal ml-2">
                          &ldquo;{release.codename}&rdquo;
                        </span>
                      </h3>
                      <p className="text-slate-400 text-sm">{release.date}</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full border capitalize ${getStatusBadge(
                      release.status
                    )}`}
                  >
                    {release.status}
                  </span>
                </div>

                <ul className="space-y-2">
                  {release.highlights.map((highlight, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-slate-300 text-sm"
                    >
                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4 text-center">
            What&apos;s Next
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Our roadmap is shaped by community feedback. Here&apos;s what
            we&apos;re working on.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {roadmap.map((quarter) => (
              <div
                key={quarter.quarter}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">
                    {quarter.quarter}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {quarter.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-slate-400 text-sm"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Version Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            API Versions
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Version
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Sunset Date
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Documentation
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-800">
                  <td className="py-3 px-4 text-white font-medium">
                    v3 (latest)
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs bg-green-500/10 text-green-400 rounded-full">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">-</td>
                  <td className="py-3 px-4">
                    <Link
                      href="/playground"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      View Docs →
                    </Link>
                  </td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-3 px-4 text-white font-medium">v2</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs bg-yellow-500/10 text-yellow-400 rounded-full">
                      Maintenance
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">June 2026</td>
                  <td className="py-3 px-4">
                    <Link
                      href="/playground"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      View Docs →
                    </Link>
                  </td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-3 px-4 text-white font-medium">v1</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded-full">
                      Deprecated
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">March 2025</td>
                  <td className="py-3 px-4 text-slate-500">Archived</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Stay Updated
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Subscribe to our newsletter to get notified about new releases and
            features.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-lg transition-all">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
