import Link from "next/link";
import { BookOpenIcon, CodeIcon, ArrowRightIcon, CheckCircleIcon } from "@phosphor-icons/react/ssr";
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
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
            <BookOpenIcon className="w-4 h-4" />
            Documentation
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">SEFGH Docs</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Quick links to guides and API references. Replace this stub content with your real docs source when ready.
          </p>
          <div className="flex items-center justify-center gap-3 text-sm text-primary">
            <CheckCircleIcon className="w-4 h-4" /> Updated for 2026 release
          </div>
        </header>

        <section className="grid md:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-border bg-card/60 p-5 space-y-3"
            >
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {section.items.map((item) => (
                  <li key={item.label} className="flex items-center justify-between">
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-2 hover:text-primary"
                    >
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 text-foreground">
            <CodeIcon className="w-5 h-5 text-primary" />
            <div>
              <div className="font-semibold">Prefer API examples?</div>
              <p className="text-muted-foreground text-sm">Jump to the API reference with curl and JavaScript snippets.</p>
            </div>
          </div>
          <Link
            href="/api-reference"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-primary text-white text-sm font-medium"
          >
            View API Reference <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </section>
      </div>
      <AppFooter />
    </main>
  );
}
