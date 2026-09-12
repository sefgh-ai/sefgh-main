import { Link as LinkIcon } from "lucide-react";
import AppFooter from "@/components/ui/app-footer";
import SitemapList from "./SitemapList";

export const metadata = {
  title: "Sitemap Preview | SEFGH",
  description: "Preview URLs from sitemap.xml before shipping navigation changes.",
  alternates: { canonical: "https://sefgh.org/sitemap-preview" },
};

export default function SitemapPreviewPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <header className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200 text-sm font-medium">
            <LinkIcon className="w-4 h-4" />
            Sitemap preview
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">Your indexed pages</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Quick view of sitemap entries detected in{" "}
            <code className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              /sitemap.xml
            </code>
            . Useful before shipping navigation changes.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-blue-900/20 space-y-4">
          <SitemapList />
        </section>
      </div>
      <AppFooter />
    </main>
  );
}
