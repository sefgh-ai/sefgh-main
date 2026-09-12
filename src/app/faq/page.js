import { HelpCircle } from "lucide-react";
import AppFooter from "@/components/ui/app-footer";
import FaqAccordion from "./FaqAccordion";

export const metadata = {
  title: "FAQ | SEFGH",
  description: "Frequently asked questions about SEFGH.",
  alternates: { canonical: "https://sefgh.org/faq" },
};

const faqItems = [
  {
    q: "Is there a free tier?",
    a: "Yes. 100 searches/month plus basic semantic search. Upgrade for chat and higher limits.",
  },
  {
    q: "How do I get API access?",
    a: "Create an account, open settings → API keys, then use the key with the API reference endpoints.",
  },
  {
    q: "Do you support private repos?",
    a: "Planned. Today we index public GitHub repositories; private access will require org consent.",
  },
  {
    q: "What models power SEFGH?",
    a: "We combine OpenAI models with custom rerankers and embeddings. Latency is optimized per region.",
  },
];

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">Frequently Asked Questions</h1>
          <p className="text-muted-foreground">Quick answers. Replace or extend this list anytime.</p>
        </header>

        <FaqAccordion items={faqItems} />
      </div>
      <AppFooter />
    </main>
  );
}
