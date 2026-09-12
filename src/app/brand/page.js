"use client";

import Link from "next/link";
import Image from "next/image";
import AppFooter from "@/components/ui/app-footer";
import { Download, Copy, Check, Shield } from "lucide-react";
import { useState } from "react";

export default function BrandPage() {
  const [copiedColor, setCopiedColor] = useState(null);

  const brandColors = [
    {
      name: "Primary Blue",
      hex: "#2563eb",
      rgb: "37, 99, 235",
      usage: "Primary actions, links, accents",
    },
    {
      name: "Secondary Teal",
      hex: "#10b981",
      rgb: "16, 185, 129",
      usage: "Success states, highlights",
    },
    {
      name: "Dark Background",
      hex: "#0f172a",
      rgb: "15, 23, 42",
      usage: "Main background (slate-900)",
    },
    {
      name: "Darker Background",
      hex: "#020617",
      rgb: "2, 6, 23",
      usage: "Deep background (slate-950)",
    },
    {
      name: "Text Primary",
      hex: "#f8fafc",
      rgb: "248, 250, 252",
      usage: "Primary text (slate-50)",
    },
    {
      name: "Text Secondary",
      hex: "#94a3b8",
      rgb: "148, 163, 184",
      usage: "Secondary text (slate-400)",
    },
    {
      name: "Border",
      hex: "#334155",
      rgb: "51, 65, 85",
      usage: "Borders, dividers (slate-700)",
    },
    {
      name: "Accent Purple",
      hex: "#8b5cf6",
      rgb: "139, 92, 246",
      usage: "Special highlights",
    },
  ];

  const logos = [
    {
      name: "Logo Full Color",
      file: "/logo.jpg",
      desc: "Primary logo for light backgrounds",
    },
    {
      name: "GitHub Mark",
      file: "/github-mark.svg",
      desc: "GitHub integration icon",
    },
    {
      name: "Hugging Face",
      file: "/hf-logo.svg",
      desc: "AI/ML integration icon",
    },
  ];

  const copyToClipboard = (text, colorName) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(colorName);
    setTimeout(() => setCopiedColor(null), 2000);
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
            <Link href="/brand" className="text-white transition-colors">
              Brand
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            SEFGH<span className="text-blue-500">-AI</span> Brand Guidelines
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed max-w-3xl mx-auto">
            Resources and guidelines for using the SEFGH-AI brand. Download our
            logos, use our color palette, and represent our brand consistently.
          </p>
        </div>
      </section>

      {/* Brand Colors Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">Brand Colors</h2>
          <p className="text-slate-400 mb-8 max-w-2xl">
            Our color palette is designed for dark interfaces, providing
            excellent contrast and a premium feel. Click any color to copy its
            hex value.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {brandColors.map((color) => (
              <div
                key={color.name}
                className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors group"
              >
                <div
                  className="h-24 cursor-pointer relative"
                  style={{ backgroundColor: color.hex }}
                  onClick={() => copyToClipboard(color.hex, color.name)}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    {copiedColor === color.name ? (
                      <Check className="w-6 h-6 text-white" />
                    ) : (
                      <Copy className="w-6 h-6 text-white" />
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-white font-semibold mb-1">
                    {color.name}
                  </h3>
                  <p className="text-slate-400 text-sm font-mono mb-2">
                    {color.hex}
                  </p>
                  <p className="text-slate-500 text-xs">{color.usage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gradients Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">
            Brand Gradients
          </h2>
          <p className="text-slate-400 mb-8 max-w-2xl">
            Our signature gradients used across the platform for buttons,
            accents, and backgrounds.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-500"></div>
              <div className="bg-slate-800/50 border border-slate-700 border-t-0 p-4 rounded-b-xl">
                <h3 className="text-white font-semibold mb-1">
                  Primary Button
                </h3>
                <p className="text-slate-400 text-sm font-mono">
                  from-blue-600 to-blue-500
                </p>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-blue-600 to-emerald-600"></div>
              <div className="bg-slate-800/50 border border-slate-700 border-t-0 p-4 rounded-b-xl">
                <h3 className="text-white font-semibold mb-1">
                  Accent Gradient
                </h3>
                <p className="text-slate-400 text-sm font-mono">
                  from-blue-600 to-emerald-600
                </p>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600"></div>
              <div className="bg-slate-800/50 border border-slate-700 border-t-0 p-4 rounded-b-xl">
                <h3 className="text-white font-semibold mb-1">Logo Gradient</h3>
                <p className="text-slate-400 text-sm font-mono">
                  from-blue-500 to-purple-600
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">Logos & Icons</h2>
          <p className="text-slate-400 mb-8 max-w-2xl">
            Download our official logos and icons. Please maintain clear space
            around the logo and don&apos;t alter, rotate, or distort it.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {logos.map((logo) => (
              <div
                key={logo.name}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-colors"
              >
                <div className="h-32 flex items-center justify-center mb-4 bg-slate-900/50 rounded-lg">
                  <Image
                    src={logo.file}
                    alt={logo.name}
                    width={80}
                    height={80}
                    className="object-contain"
                  />
                </div>
                <h3 className="text-white font-semibold mb-1">{logo.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{logo.desc}</p>
                <a
                  href={logo.file}
                  download
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Typography Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">Typography</h2>
          <p className="text-slate-400 mb-8 max-w-2xl">
            We use Inter as our primary font family across all platforms for its
            excellent readability and modern aesthetic.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Font Family</h3>
              <p className="text-4xl text-white font-bold mb-2">Inter</p>
              <p className="text-slate-400 text-sm">
                Primary: Inter, system-ui, sans-serif
                <br />
                Monospace: ui-monospace, SFMono-Regular, Consolas
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Type Scale</h3>
              <div className="space-y-2">
                <p className="text-4xl text-white font-bold">Heading 1</p>
                <p className="text-2xl text-white font-semibold">Heading 2</p>
                <p className="text-xl text-white font-medium">Heading 3</p>
                <p className="text-base text-slate-300">Body text</p>
                <p className="text-sm text-slate-400">Small text</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Usage Guidelines Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">
            Usage Guidelines
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-green-400 font-semibold mb-4 flex items-center gap-2">
                <Check className="w-5 h-5" />
                Do
              </h3>
              <ul className="space-y-3 text-slate-300 text-sm">
                <li>• Use the logo with adequate clear space</li>
                <li>• Maintain the original aspect ratio</li>
                <li>• Use approved colors from our palette</li>
                <li>• Link back to sefgh.com when using our assets</li>
                <li>• Use for editorial or informational purposes</li>
              </ul>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-red-400 font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Don&apos;t
              </h3>
              <ul className="space-y-3 text-slate-300 text-sm">
                <li>• Modify or distort the logo</li>
                <li>• Change the logo colors</li>
                <li>• Add effects like shadows or gradients to logo</li>
                <li>• Use in a way that implies endorsement</li>
                <li>• Use for merchandise without permission</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Copyright & Legal Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              Copyright & Trademark Notice
            </h2>
            <div className="text-slate-300 space-y-4">
              <p>
                <strong className="text-white">
                  © {new Date().getFullYear()} SEFGH-AI. All rights reserved.
                </strong>
              </p>
              <p className="text-sm leading-relaxed">
                SEFGH, SEFGH-AI, and the SEFGH logo are trademarks of SEFGH-AI.
                All other trademarks, logos, and brand names shown on this page
                are the property of their respective owners.
              </p>
              <p className="text-sm leading-relaxed">
                These brand assets are provided for use in accordance with these
                guidelines. By downloading or using these assets, you agree to
                follow these guidelines and all applicable trademark laws.
                Unauthorized use of these materials may violate copyright,
                trademark, and other laws.
              </p>
              <p className="text-sm leading-relaxed">
                For press inquiries, partnerships, or special permission
                requests regarding the use of our brand assets, please contact
                us at{" "}
                <a
                  href="mailto:brand@sefgh.com"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  brand@sefgh.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Need something specific?
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Contact our team for custom assets, high-resolution files, or
            special requests.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-lg transition-all shadow-lg"
          >
            Contact Us
          </Link>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
