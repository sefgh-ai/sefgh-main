import Link from "next/link";
import { BookOpen, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import AppFooter from "@/components/ui/app-footer";

export const metadata = {
  title: "Documentation | SEFGH",
  description: "Getting started guides, concepts, and integration steps for SEFGH.",
  alternates: { canonical: "https://sefgh.org/docs" },
};

const sections = [
  {
    title: "Get started",
    items: [
      { label: "Overview", href: "/docs#overview" },
      { label: "Quickstart", href: "/docs#quickstart" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "API",
    items: [
      { label: "API Reference", href: "/api-reference" },
      { label: "Auth & keys", href: "/api-reference#auth" },
      { label: "Rate limits", href: "/api-reference#limits" },
    ],
  },
  {
    title: "Use cases",
    items: [
      { label: "Search embeddings", href: "/docs#embeddings" },
      { label: "Chat with repos", href: "/docs#chat" },
      { label: "Trending + curation", href: "/trending" },
    ],
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200 text-sm font-medium">
            <BookOpen className="w-4 h-4" />
            Documentation
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">SEFGH Docs</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Quick links to guides and API references. Replace this stub content with your real docs source when ready.
          </p>
          <div className="flex items-center justify-center gap-3 text-sm text-blue-200">
            <CheckCircle2 className="w-4 h-4" /> Updated for 2026 release
          </div>
        </header>

        <section className="grid md:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3"
            >
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <ul className="space-y-2 text-sm text-slate-300">
                {section.items.map((item) => (
                  <li key={item.label} className="flex items-center justify-between">
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-2 hover:text-blue-200"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 text-slate-200">
            <Sparkles className="w-5 h-5 text-blue-300" />
            <div>
              <div className="font-semibold">Prefer API examples?</div>
              <p className="text-slate-400 text-sm">Jump to the API reference with curl and JavaScript snippets.</p>
            </div>
          </div>
          <Link
            href="/api-reference"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
          >
            View API Reference <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
      <AppFooter />
    </main>
  );
}
