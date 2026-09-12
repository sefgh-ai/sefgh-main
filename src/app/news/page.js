import { ArrowRight, CalendarDays, Megaphone, Sparkles } from "lucide-react";
import Link from "next/link";
import AppFooter from "@/components/ui/app-footer";
import { releaseNotes } from "@/data/releaseNotes";

export const metadata = {
  title: "Release Notes | SEFGH",
  description: "Latest news, updates, and release notes for SEFGH.",
};

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200 text-sm font-medium">
            <Megaphone className="w-4 h-4" />
            Latest news & releases
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">Release notes</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Track what changed across SEFGH: features, fixes, and performance updates. We keep this log concise and actionable.
          </p>
        </header>

        <section className="space-y-6">
          {releaseNotes.map((note) => (
            <article
              key={note.version}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-blue-900/20"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800 text-slate-200">
                    <Sparkles className="w-4 h-4 text-blue-300" />
                    {note.version}
                  </span>
                  <span className="text-slate-700">•</span>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    {note.date}
                  </span>
                </div>
                <Link
                  href="/feedback"
                  className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm font-medium"
                >
                  Share feedback <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <h2 className="text-2xl font-semibold mt-2">{note.title}</h2>
              <ul className="mt-3 space-y-2 text-slate-300">
                {note.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
      <AppFooter />
    </main>
  );
}
