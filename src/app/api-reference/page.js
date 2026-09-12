import Link from "next/link";
import { Code2, KeyRound, ShieldCheck, Gauge, ArrowRight } from "lucide-react";
import AppFooter from "@/components/ui/app-footer";

export const metadata = {
  title: "API Reference | SEFGH",
  description: "Mock API reference overview. Swap with live docs when ready.",
  alternates: { canonical: "https://sefgh.org/api-reference" },
};

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/search",
    desc: "Semantic + keyword search across GitHub.",
    note: "Query, language, stars, pagination parameters supported.",
  },
  {
    method: "POST",
    path: "/api/v1/chat",
    desc: "Chat with repositories or code snippets.",
    note: "Send message, repo context, and mode (explain / summarize).",
  },
  {
    method: "GET",
    path: "/api/v1/trending",
    desc: "Trending repositories with filters.",
    note: "Params: since=daily|weekly|monthly, language, spokenLanguage.",
  },
];

export default function ApiReferencePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-200 text-sm font-medium">
            <Code2 className="w-4 h-4" />
            API reference
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">SEFGH API</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Mock endpoint list for now. Swap this page to your generated docs once the API is live.
          </p>
        </header>

        <section className="grid md:grid-cols-3 gap-4">
          {endpoints.map((ep) => (
            <div
              key={ep.path}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2"
            >
              <div className="flex items-center gap-2 text-sm text-emerald-200">
                <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 uppercase font-semibold text-xs">
                  {ep.method}
                </span>
                <span className="text-slate-300 font-mono text-sm">{ep.path}</span>
              </div>
              <div className="text-white font-semibold">{ep.desc}</div>
              <p className="text-slate-400 text-sm">{ep.note}</p>
            </div>
          ))}
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          {[{ title: "Auth", desc: "Use bearer tokens from account settings.", Icon: KeyRound }, { title: "Rate limits", desc: "Tier-based limits; contact us for higher quotas.", Icon: Gauge }, { title: "Security", desc: "HTTPS required; keys must be kept secret.", Icon: ShieldCheck }].map(({ title, desc, Icon }) => (
            <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
              <Icon className="w-5 h-5 text-blue-300" />
              <div className="text-white font-semibold">{title}</div>
              <p className="text-slate-400 text-sm">{desc}</p>
            </div>
          ))}
        </section>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-slate-200">
            Need SDK samples? This is a placeholder—link it to your real docs repo later.
          </div>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
          >
            Go to Docs <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
      <AppFooter />
    </main>
  );
}
