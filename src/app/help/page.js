import Link from "next/link";
import { LifeBuoy, Mail, MessageCircle, BookOpen } from "@/components/ui/icons";
import AppFooter from "@/components/ui/app-footer";

export const metadata = {
  title: "Help Center | SEFGH",
  description: "Support channels and resources for SEFGH users.",
  alternates: { canonical: "https://sefgh.org/help" },
};

const resources = [
  {
    icon: BookOpen,
    title: "Documentation",
    desc: "Guides, concepts, and API reference.",
    href: "/docs",
  },
  {
    icon: MessageCircle,
    title: "Community",
    desc: "Ask the community or visit the forum thread.",
    href: "/forum",
  },
  {
    icon: Mail,
    title: "Contact support",
    desc: "Reach us at support@sefgh.org for account issues.",
    href: "mailto:support@sefgh.org",
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <header className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
            <LifeBuoy className="w-4 h-4" />
            Help center
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">How can we help?</h1>
          <p className="text-muted-foreground">Pick a channel below. Replace with your real support flows later.</p>
        </header>

        <section className="grid md:grid-cols-3 gap-4">
          {resources.map(({ icon: Icon, title, desc, href }) => (
            <Link
              key={title}
              href={href}
              className="rounded-2xl border border-border bg-card/60 p-5 hover:border-blue-500/40 transition"
            >
              <div className="flex items-center gap-3 text-foreground">
                <Icon className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-semibold">{title}</div>
                  <p className="text-muted-foreground text-sm">{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
      <AppFooter />
    </main>
  );
}
