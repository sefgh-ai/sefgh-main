"use client";

import Link from "next/link";
import AppFooter from "@/components/ui/app-footer";

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Terms & Conditions
        </h1>
        <p className="text-muted-foreground mb-8">
          Effective Date: January 8, 2026 | Last Updated: January 8, 2026
        </p>

        <div className="prose prose-invert prose-slate max-w-none">
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-8">
            <p className="text-muted-foreground text-sm">
              <strong className="text-foreground">Important:</strong> These terms
              constitute a legal agreement. Please read carefully before using
              SEFGH-AI. This document is for informational purposes and should
              be reviewed by legal counsel for your specific situation.
            </p>
          </div>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              1. Agreement to Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              By accessing or using SEFGH-AI (&quot;Service&quot;), you agree to be bound
              by these Terms & Conditions (&quot;Terms&quot;). If you disagree with any
              part, you may not access the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              SEFGH-AI is an AI-powered GitHub repository search platform
              operated by SEFGH (&quot;Company,&quot; &quot;we,&quot; &quot;us&quot;). These Terms govern your
              use of our website at sefgh.org and all related services.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              2. Description of Service
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              SEFGH-AI provides:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>AI-powered semantic search for GitHub repositories</li>
              <li>Natural language query processing</li>
              <li>Repository analysis and code exploration tools</li>
              <li>AI chat assistant for development queries</li>
              <li>API access for integrations (where available)</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              3. User Accounts
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When creating an account, you agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information as needed</li>
              <li>Keep your password secure and confidential</li>
              <li>
                Accept responsibility for all activities under your account
              </li>
              <li>Notify us immediately of unauthorized access</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We reserve the right to suspend or terminate accounts that violate
              these Terms or for any reason at our discretion.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              4. Subscriptions and Billing
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              For paid features:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <strong className="text-foreground">Billing Cycle:</strong>{" "}
                Subscriptions are billed monthly or annually as selected
              </li>
              <li>
                <strong className="text-foreground">Auto-Renewal:</strong>{" "}
                Subscriptions automatically renew unless cancelled
              </li>
              <li>
                <strong className="text-foreground">Cancellation:</strong> Cancel
                anytime; access continues until period ends
              </li>
              <li>
                <strong className="text-foreground">Refunds:</strong> No refunds for
                partial periods; contact support for billing issues
              </li>
              <li>
                <strong className="text-foreground">Price Changes:</strong> We&apos;ll
                notify you 30 days before any price increases
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              5. Intellectual Property
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">Our Property:</strong> The Service,
              including its design, features, content, and underlying
              technology, is owned by SEFGH and protected by intellectual
              property laws.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">Your Content:</strong> You retain
              ownership of any content you submit. By using our Service, you
              grant us a limited license to process your queries to provide the
              Service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Third-Party Content:</strong>{" "}
              Repository data accessed through our Service belongs to respective
              GitHub repository owners and is subject to their licenses.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              6. Limitation of Liability
            </h2>
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-muted-foreground leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, SEFGH SHALL NOT BE
                LIABLE FOR:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  Indirect, incidental, special, consequential, or punitive
                  damages
                </li>
                <li>Loss of profits, data, use, or goodwill</li>
                <li>Service interruptions or data inaccuracies</li>
                <li>Actions based on AI-generated recommendations</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Our total liability shall not exceed the amount paid by you in
                the 12 months preceding the claim.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              7. Disclaimers
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The Service is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; without
              warranties of any kind, express or implied, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Merchantability or fitness for a particular purpose</li>
              <li>Accuracy or completeness of search results</li>
              <li>Uninterrupted or error-free operation</li>
              <li>Security against all possible threats</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              AI-generated content should be verified independently. We do not
              guarantee the quality, safety, or legality of repositories found
              through our Service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              8. Dispute Resolution
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">Informal Resolution:</strong>{" "}
              Before filing any claim, you agree to contact us at
              legal@sefgh.org to attempt resolution informally for at least 30
              days.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">Arbitration:</strong> Any disputes
              not resolved informally shall be resolved through binding
              arbitration in accordance with the rules of the American
              Arbitration Association.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Class Action Waiver:</strong> You
              agree to resolve disputes individually and waive any right to
              participate in class actions.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              9. Governing Law
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of the State of Delaware,
              United States, without regard to conflict of law principles. Any
              legal proceedings shall be conducted in the state or federal
              courts located in Delaware.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              10. Changes to Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may modify these Terms at any time. Material changes will be
              communicated via email or prominent notice on the Service.
              Continued use after changes constitutes acceptance of the modified
              Terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              11. Contact Information
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, contact us at:
            </p>
            <div className="mt-4 text-muted-foreground">
              <p>SEFGH</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:legal@sefgh.org"
                  className="text-primary hover:underline"
                >
                  legal@sefgh.org
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>

      <AppFooter />
    </main>
  );
}
