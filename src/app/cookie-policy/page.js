"use client";

import Link from "next/link";
import AppFooter from "@/components/ui/app-footer";

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-background overflow-y-auto">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-foreground">
            SEFGH<span className="text-primary">-AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              href="/search"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-foreground mb-4">Cookie Policy</h1>
        <p className="text-muted-foreground mb-8">
          Effective Date: January 8, 2026 | Last Updated: January 8, 2026
        </p>

        <div className="prose prose-invert prose-slate max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              What Are Cookies?
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Cookies are small text files stored on your device when you visit
              websites. They help us recognize your browser, remember your
              preferences, and improve your experience on SEFGH-AI.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              How We Use Cookies
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              SEFGH-AI uses cookies to provide, secure, and improve our
              AI-powered GitHub repository search platform. Here&apos;s how:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <strong className="text-foreground">Authentication:</strong> Keep you
                signed in during your session
              </li>
              <li>
                <strong className="text-foreground">Preferences:</strong> Remember
                your theme, language, and search settings
              </li>
              <li>
                <strong className="text-foreground">Analytics:</strong> Understand
                how users interact with our platform
              </li>
              <li>
                <strong className="text-foreground">Security:</strong> Detect and
                prevent fraudulent activity
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Types of Cookies We Use
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-4 py-3 text-left text-foreground">
                      Category
                    </th>
                    <th className="border border-border px-4 py-3 text-left text-foreground">
                      Purpose
                    </th>
                    <th className="border border-border px-4 py-3 text-left text-foreground">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr>
                    <td className="border border-border px-4 py-3">
                      <strong>Essential</strong>
                    </td>
                    <td className="border border-border px-4 py-3">
                      Authentication, security, basic functionality
                    </td>
                    <td className="border border-border px-4 py-3">
                      Session - 30 days
                    </td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td className="border border-border px-4 py-3">
                      <strong>Functional</strong>
                    </td>
                    <td className="border border-border px-4 py-3">
                      Theme preferences, language settings, search history
                    </td>
                    <td className="border border-border px-4 py-3">
                      1 year
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-3">
                      <strong>Analytics</strong>
                    </td>
                    <td className="border border-border px-4 py-3">
                      Usage patterns, feature popularity, performance metrics
                    </td>
                    <td className="border border-border px-4 py-3">
                      2 years
                    </td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td className="border border-border px-4 py-3">
                      <strong>Marketing</strong>
                    </td>
                    <td className="border border-border px-4 py-3">
                      Personalized recommendations (with consent)
                    </td>
                    <td className="border border-border px-4 py-3">
                      90 days
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Third-Party Cookies
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use trusted third-party services that may set their own
              cookies:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <strong className="text-foreground">Google Analytics:</strong>{" "}
                Traffic analysis and user behavior insights
              </li>
              <li>
                <strong className="text-foreground">Supabase:</strong> Authentication
                and database services
              </li>
              <li>
                <strong className="text-foreground">Stripe:</strong> Payment
                processing (for premium features)
              </li>
              <li>
                <strong className="text-foreground">GitHub OAuth:</strong> Social
                login functionality
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Managing Your Cookie Preferences
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You have control over cookies:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <strong className="text-foreground">Browser Settings:</strong> Most
                browsers let you block or delete cookies via settings
              </li>
              <li>
                <strong className="text-foreground">Our Platform:</strong> Adjust
                preferences in your account settings
              </li>
              <li>
                <strong className="text-foreground">Opt-Out Links:</strong>{" "}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Analytics Opt-Out
                </a>
              </li>
            </ul>
            <p className="text-muted-foreground mt-4 text-sm">
              Note: Disabling essential cookies may affect platform
              functionality, including login and search features.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Updates to This Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookie Policy periodically. Changes will be
              posted here with an updated effective date. Continued use of
              SEFGH-AI after changes constitutes acceptance.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Contact Us
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions about our cookie practices? Contact us at{" "}
              <a
                href="mailto:privacy@sefgh.org"
                className="text-primary hover:underline"
              >
                privacy@sefgh.org
              </a>
            </p>
          </section>
        </div>
      </div>

      <AppFooter />
    </main>
  );
}
