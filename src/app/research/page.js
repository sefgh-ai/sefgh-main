import Link from "next/link";
import { ArrowUpRightIcon, FlaskIcon, BookOpenIcon, ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";
import AppFooter from "@/components/ui/app-footer";
import { researchHighlights } from "@/data/researchHighlights";

export const metadata = {
  title: "Research | SEFGH",
  description: "Frontier research updates and links to OpenAI research resources.",
};

export default function ResearchPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-200 text-sm font-medium">
            <FlaskIcon className="w-4 h-4" />
            Research spotlight
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">Frontier research</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stay close to the work that shapes SEFGH: breakthroughs in language models, code intelligence, and safety.
          </p>
        </header>

        <section className="grid md:grid-cols-2 gap-6">
          {researchHighlights.map((item) => (
            <article
              key={item.title}
              className="relative rounded-2xl border border-border bg-card/60 p-6 overflow-hidden shadow-lg shadow-purple-900/20"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${item.accent} pointer-events-none`}
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{item.title}</h2>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{item.description}</p>
                </div>
                <FlaskIcon className="shrink-0 w-5 h-5 text-purple-200" />
              </div>
              <Link
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="relative inline-flex items-center gap-2 text-primary hover:text-primary text-sm font-medium mt-4"
              >
                {item.cta}
                <ArrowUpRightIcon className="w-4 h-4" />
              </Link>
            </article>
          ))}
        </section>

        <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-lg shadow-blue-900/20">
          <div className="flex items-center gap-3 text-foreground">
            <BookOpenIcon className="w-5 h-5 text-primary" />
            <div>
              <div className="font-semibold">SEFGH + OpenAI research feed</div>
              <p className="text-muted-foreground text-sm">We surface relevant breakthroughs inside the app when they land.</p>
            </div>
          </div>
          <Link
            href="https://openai.com/research/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-primary text-white text-sm font-medium"
          >
            Visit OpenAI Research <ArrowSquareOutIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
      <AppFooter />
    </main>
  );
}
