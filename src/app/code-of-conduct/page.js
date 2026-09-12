import AppFooter from "@/components/ui/app-footer";
import Link from "next/link";
import { Shield, HeartHandshake, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Code of Conduct | SEFGH",
  description: "Community expectations and enforcement guidelines.",
  alternates: { canonical: "https://sefgh.org/code-of-conduct" },
};

const rules = [
  "Be respectful and inclusive; no harassment or hateful conduct.",
  "Assume positive intent; disagree constructively.",
  "No spam, self-promotion, or unauthorized ads.",
  "Keep credentials and sensitive data out of posts and code samples.",
  "Follow applicable laws and GitHub terms when sharing code.",
];

export default function CodeOfConductPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <header className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200 text-sm font-medium">
            <Shield className="w-4 h-4" />
            Code of Conduct
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">Our community pledge</h1>
          <p className="text-slate-400">Guidelines for respectful collaboration. Replace or extend these as needed.</p>
        </header>

        <section className="space-y-3">
          {rules.map((rule) => (
            <div key={rule} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-slate-200 text-sm">
              {rule}
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-200">
            <AlertTriangle className="w-5 h-5" />
            Reporting
          </div>
          <p className="text-slate-300 text-sm">
            Report violations to <a href="mailto:support@sefgh.org" className="text-blue-300 hover:text-blue-200">support@sefgh.org</a>. We may warn, suspend, or remove users based on severity.
          </p>
          <p className="text-slate-400 text-xs">
            This is a placeholder policy; align with your legal counsel before launch.
          </p>
        </section>

        <div className="text-center text-sm text-slate-400">
          See also <Link href="/terms-of-use" className="text-blue-300 hover:text-blue-200">Terms</Link> and <Link href="/privacy" className="text-blue-300 hover:text-blue-200">Privacy</Link>.
        </div>
      </div>
      <AppFooter />
    </main>
  );
}
