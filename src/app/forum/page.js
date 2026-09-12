import Link from "next/link";
import { MessageSquare, ExternalLink } from "lucide-react";
import AppFooter from "@/components/ui/app-footer";

export const metadata = {
  title: "Forum | SEFGH",
  description: "Community forum entry point with Reddit link/embedding placeholder.",
  alternates: { canonical: "https://sefgh.org/forum" },
};

export default function ForumPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200 text-sm font-medium">
            <MessageSquare className="w-4 h-4" />
            Forum
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">Join the discussion</h1>
          <p className="text-slate-400">We host conversations on Reddit. Embed or link out when live.</p>
        </header>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center space-y-3">
            <p className="text-slate-200 text-lg">Visit our Reddit community</p>
            <Link
              href="https://www.reddit.com/r/sefgh"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold"
            >
              Go to r/sefgh <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-slate-400 text-sm">
            Placeholder for embed. Drop in Reddit widget or custom thread feed here.
          </div>
        </section>
      </div>
      <AppFooter />
    </main>
  );
}
