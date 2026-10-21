import Link from "next/link";
import { MessageSquare, ExternalLink } from "@/components/ui/icons";
import AppFooter from "@/components/ui/app-footer";

export const metadata = {
  title: "Forum | SEFGH",
  description: "Community forum entry point with Reddit link/embedding placeholder.",
  alternates: { canonical: "https://sefgh.org/forum" },
};

export default function ForumPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
            <MessageSquare className="w-4 h-4" />
            Forum
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">Join the discussion</h1>
          <p className="text-muted-foreground">We host conversations on Reddit. Embed or link out when live.</p>
        </header>

        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/60 p-6 text-center space-y-3">
            <p className="text-foreground text-lg">Visit our Reddit community</p>
            <Link
              href="https://www.reddit.com/r/sefgh"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold"
            >
              Go to r/sefgh <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-muted-foreground text-sm">
            Placeholder for embed. Drop in Reddit widget or custom thread feed here.
          </div>
        </section>
      </div>
      <AppFooter />
    </main>
  );
}
