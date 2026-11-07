import Link from "next/link";
import { CalendarDotsIcon, ArrowRightIcon, PencilLineIcon } from "@phosphor-icons/react/ssr";
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
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <header className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
            <PencilLineIcon className="w-4 h-4" />
            Blog
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">SEFGH Blog</h1>
          <p className="text-muted-foreground">Stories, launches, and deep-dives. Point this to your CMS when ready.</p>
        </header>

        <section className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.title}
              className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <CalendarDotsIcon className="w-4 h-4" /> {post.date}
              </div>
              <h2 className="text-xl font-semibold">{post.title}</h2>
              <p className="text-muted-foreground text-sm">{post.excerpt}</p>
              <Link
                href={post.href}
                className="inline-flex items-center gap-2 text-primary hover:text-primary text-sm font-medium"
              >
                Read more <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </article>
          ))}
        </section>
      </div>
      <AppFooter />
    </main>
  );
}
