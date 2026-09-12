"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Instagram, Twitter } from "lucide-react";

export default function FooterNewsletter() {
  return (
    <div className="relative w-full bg-slate-950 text-slate-200 overflow-hidden pt-16 pb-8 px-4 sm:px-6 lg:px-8">
      {/* Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl translate-y-1/2 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* SEFGH Insider Newsletter */}
        <div className="relative mb-16 group isolate">
          {/* Animated Border Container */}
          <div className="absolute -inset-[2px] rounded-2xl overflow-hidden z-[-1]">
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Spinning Gradient - Blue & Green */}
              <div className="absolute w-[3000px] h-[3000px] bg-[conic-gradient(from_0deg,#000000_0%,#2563eb_10%,#000000_20%,#000000_50%,#10b981_60%,#000000_70%)] animate-[spin_4s_linear_infinite] opacity-100"></div>
            </div>
          </div>

          {/* Ambient Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500 z-[-2]"></div>

          <div className="relative bg-slate-900 rounded-2xl p-8 md:p-12 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Column */}
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                  Subscribe to The SEFGH Insider
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
                  A newsletter for developers, covering techniques, technical
                  guides, and the latest product innovations from SEFGH.
                </p>
              </div>
              {/* Right Column */}
              <div className="flex flex-col gap-4 w-full max-w-md ml-auto">
                <label className="text-sm text-slate-400 font-medium">
                  Email Address <span className="text-emerald-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="you@company.com"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                  <button className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all shadow-lg shadow-blue-900/20 whitespace-nowrap hover:shadow-blue-900/40 hover:-translate-y-0.5">
                    Subscribe &gt;
                  </button>
                </div>
                <div className="flex items-start gap-3 mt-1">
                  <div className="flex items-center h-5">
                    <input
                      id="newsletter-consent"
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                  </div>
                  <label
                    htmlFor="newsletter-consent"
                    className="text-xs text-slate-500 leading-relaxed cursor-pointer select-none"
                  >
                    I agree to receive personalized communications, targeted
                    advertising, and campaign updates related to SEFGH.
                    <Link
                      href="#"
                      className="text-blue-400 hover:text-blue-300 hover:underline transition-colors ml-1"
                    >
                      SEFGH Privacy Statement
                    </Link>
                    .
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-column Links Grid */}
        <div className="flex flex-col lg:flex-row justify-between gap-12 mb-12 max-w-7xl mx-auto">
          {/* Links Section - Left */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 flex-1">
            {/* Column 1: Company */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-white">Company</h3>
              <ul className="flex flex-col gap-3">
                {[
                  { name: "About", href: "/about" },
                  { name: "Contact Us", href: "/contact" },
                  { name: "Pricing", href: "/pricing" },
                  { name: "Careers", href: "/careers" },
                  { name: "Brand", href: "/brand" },
                  { name: "Blog", href: "/blog" },
                ].map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Resources */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-white">Resources</h3>
              <ul className="flex flex-col gap-3">
                {[
                  { name: "Home Page", href: "/" },
                  { name: "Search Page", href: "/search" },
                  { name: "Versions", href: "/versions" },
                  { name: "Downloads", href: "/download" },
                  { name: "Trending", href: "/trending" },
                  { name: "Docs", href: "/docs" },
                  { name: "API Reference", href: "/api-reference" },
                  { name: "FAQ", href: "/faq" },
                  { name: "Help Center", href: "/help" },
                ].map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Legal */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-white">Legal</h3>
              <ul className="flex flex-col gap-3">
                {[
                  { name: "Cookie Policy", href: "/cookie-policy" },
                  { name: "Terms & Conditions", href: "/terms" },
                  { name: "Terms of Use", href: "/terms-of-use" },
                  { name: "Privacy Policy", href: "/privacy" },
                  { name: "Accessibility", href: "/accessibility" },
                  { name: "Code of Conduct", href: "/code-of-conduct" },
                ].map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Platform */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-white">Platform</h3>
              <ul className="flex flex-col gap-3">
                {[
                  { name: "Playground", href: "/playground" },
                  { name: "AI Chat", href: "/chat" },
                  { name: "Submissions", href: "/submissions" },
                  {
                    name: "Status Page",
                    href: "https://status.sefgh.org",
                    external: true,
                  },
                  { name: "Starred", href: "/starred" },
                  { name: "Forum", href: "/forum" },
                ].map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      {...(item.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Branding Section - Right */}
          <div className="lg:w-1/3 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.jpg"
                alt="SEFGH Logo"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="text-2xl font-semibold text-white">SEFGH</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Discover hidden GitHub gems with intelligent search. Go beyond
              keywords with natural language queries.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="https://huggingface.co/sefgh"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-yellow-500 transition-all duration-300"
              >
                <Image
                  src="/hf-logo.svg"
                  alt="Hugging Face"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
              </Link>
              <Link
                href="https://instagram.com/sefgh"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-blue-500 hover:bg-pink-600 hover:text-white transition-all duration-300"
              >
                <Instagram className="w-5 h-5" />
              </Link>
              <Link
                href="https://twitter.com/sefghai"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-blue-500 hover:bg-blue-600 hover:text-white transition-all duration-300"
              >
                <Twitter className="w-5 h-5" />
              </Link>
              <Link
                href="https://github.com/sefgh-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-gray-800 transition-all duration-300"
              >
                <Image
                  src="/github-mark.svg"
                  alt="GitHub"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
