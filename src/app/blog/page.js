import Link from "next/link";
import { CalendarDays, ArrowRight, PenLine } from "lucide-react";
import AppFooter from "@/components/ui/app-footer";

export const metadata = {
  title: "Blog | SEFGH",
  description: "Latest articles and updates. Replace with your CMS later.",
  alternates: { canonical: "https://sefgh.org/blog" },
};

const posts = [
  {
    title: "Announcing the SEFGH Playground refresh",
    date: "Mar 15, 2026",
    excerpt: "A cleaner layout, query history, and better latency for experiments.",
    href: "/news",
  },
  {
    title: "How we rank trending repositories",
    date: "Mar 02, 2026",
    excerpt: "A peek into our hybrid semantic + star-growth scoring.",
    href: "/trending",
  },
  {
    title: "API roadmap and SDK plans",
    date: "Feb 20, 2026",
    excerpt: "What to expect next for builders integrating SEFGH.",
    href: "/api-reference",
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <header className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200 text-sm font-medium">
            <PenLine className="w-4 h-4" />
            Blog
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">SEFGH Blog</h1>
          <p className="text-slate-400">Stories, launches, and deep-dives. Point this to your CMS when ready.</p>
        </header>

        <section className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <CalendarDays className="w-4 h-4" /> {post.date}
              </div>
              <h2 className="text-xl font-semibold">{post.title}</h2>
              <p className="text-slate-300 text-sm">{post.excerpt}</p>
              <Link
                href={post.href}
                className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm font-medium"
              >
                Read more <ArrowRight className="w-4 h-4" />
              </Link>
            </article>
          ))}
        </section>
      </div>
      <AppFooter />
    </main>
  );
}
