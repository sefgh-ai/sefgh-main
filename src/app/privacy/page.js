"use client";

import Link from "next/link";
import AppFooter from "@/components/ui/app-footer";

export default function PrivacyPolicyPage() {
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
        <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">
          Effective Date: January 8, 2026 | Last Updated: January 8, 2026
        </p>

        <div className="prose prose-invert prose-slate max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Introduction
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              SEFGH (&quot;we,&quot; &quot;our,&quot; &quot;us&quot;) respects your privacy and is committed
              to protecting your personal data. This Privacy Policy explains how
              we collect, use, disclose, and safeguard your information when you
              use our AI-powered GitHub repository search platform.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Information We Collect
            </h2>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">
              Personal Information You Provide
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <strong className="text-foreground">Account Data:</strong> Name,
                email address, password (encrypted)
              </li>
              <li>
                <strong className="text-foreground">Profile Data:</strong> Username,
                avatar, preferences
              </li>
              <li>
                <strong className="text-foreground">OAuth Data:</strong> Information
                from GitHub when using social login (public profile, email)
              </li>
              <li>
                <strong className="text-foreground">Payment Data:</strong> Billing
                information processed securely by Stripe (we don&apos;t store full
                card details)
              </li>
              <li>
                <strong className="text-foreground">Communications:</strong> Messages
                when you contact support
              </li>
            </ul>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">
              Information Collected Automatically
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <strong className="text-foreground">Usage Data:</strong> Search
                queries, features used, pages visited, timestamps
              </li>
              <li>
                <strong className="text-foreground">Device Data:</strong> IP address,
                browser type, operating system, device identifiers
              </li>
              <li>
                <strong className="text-foreground">Log Data:</strong> Server logs,
                error reports, performance data
              </li>
              <li>
                <strong className="text-foreground">Cookies:</strong> See our{" "}
                <Link
                  href="/cookie-policy"
                  className="text-primary hover:underline"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              How We Use Your Information
            </h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <strong className="text-foreground">Provide Services:</strong>{" "}
                Deliver search results, AI assistance, and platform features
              </li>
              <li>
                <strong className="text-foreground">Personalization:</strong>{" "}
                Customize your experience based on preferences and history
              </li>
              <li>
                <strong className="text-foreground">Improvement:</strong> Analyze
                usage to enhance our AI models and features
              </li>
              <li>
                <strong className="text-foreground">Communication:</strong> Send
                service updates, security alerts, and support responses
              </li>
              <li>
                <strong className="text-foreground">Marketing:</strong> Send
                promotional content (with your consent, easily opt out)
              </li>
              <li>
                <strong className="text-foreground">Security:</strong> Detect and
                prevent fraud, abuse, and unauthorized access
              </li>
              <li>
                <strong className="text-foreground">Legal Compliance:</strong> Meet
                legal obligations and respond to lawful requests
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Information Sharing
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not sell your personal data. We may share information with:
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3">
              Service Providers
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>
                <strong className="text-foreground">Supabase:</strong> Database and
                authentication services
              </li>
              <li>
                <strong className="text-foreground">Stripe:</strong> Payment
                processing
              </li>
              <li>
                <strong className="text-foreground">Vercel:</strong> Hosting and
                deployment
              </li>
              <li>
                <strong className="text-foreground">OpenAI/Anthropic:</strong> AI
                processing (queries may be processed to generate responses)
              </li>
              <li>
                <strong className="text-foreground">Google Analytics:</strong> Usage
                analytics
              </li>
            </ul>

            <h3 className="text-xl font-medium text-foreground mb-3">
              Other Disclosures
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <strong className="text-foreground">Legal Requirements:</strong> When
                required by law or legal process
              </li>
              <li>
                <strong className="text-foreground">Safety:</strong> To protect
                rights, safety, and security of users and public
              </li>
              <li>
                <strong className="text-foreground">Business Transfers:</strong> In
                connection with mergers, acquisitions, or asset sales
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Your Rights
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have the following rights:
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">
                  Access & Portability
                </h4>
                <p className="text-muted-foreground text-sm">
                  Request a copy of your personal data in a portable format
                </p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">Correction</h4>
                <p className="text-muted-foreground text-sm">
                  Update or correct inaccurate personal information
                </p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">Deletion</h4>
                <p className="text-muted-foreground text-sm">
                  Request deletion of your personal data
                </p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">Opt-Out</h4>
                <p className="text-muted-foreground text-sm">
                  Unsubscribe from marketing communications
                </p>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, email us at{" "}
              <a
                href="mailto:privacy@sefgh.org"
                className="text-primary hover:underline"
              >
                privacy@sefgh.org
              </a>{" "}
              or use your account settings.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Data Security
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We implement industry-standard security measures:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Encryption in transit (TLS/SSL) and at rest</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and employee training</li>
              <li>Incident response procedures</li>
            </ul>
            <p className="text-muted-foreground mt-4 text-sm">
              No system is 100% secure. We cannot guarantee absolute security
              but work continuously to protect your data.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Data Retention
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain personal data as long as your account is active or as
              needed to provide services. After account deletion, we may retain
              certain data for legal compliance, dispute resolution, or
              legitimate business purposes (typically up to 3 years). Anonymized
              analytics data may be retained indefinitely.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              International Transfers
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data may be processed in countries outside your residence,
              including the United States. We ensure appropriate safeguards are
              in place, such as Standard Contractual Clauses for EU data
              transfers.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Children&apos;s Privacy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              SEFGH-AI is not intended for children under 13 (or 16 in the EU).
              We do not knowingly collect personal data from children. If you
              believe a child has provided us with personal information, please
              contact us immediately.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              GDPR Compliance (EU Users)
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              For EU residents:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                Legal bases: Contract performance, legitimate interests, consent
              </li>
              <li>Right to lodge complaints with your supervisory authority</li>
              <li>
                Data Protection Officer:{" "}
                <a
                  href="mailto:dpo@sefgh.org"
                  className="text-primary hover:underline"
                >
                  dpo@sefgh.org
                </a>
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              CCPA Compliance (California Users)
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              California residents have additional rights:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Right to know what personal information is collected</li>
              <li>Right to delete personal information</li>
              <li>Right to opt-out of sale (we do not sell personal data)</li>
              <li>Right to non-discrimination for exercising rights</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Updates to This Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy periodically. Material changes
              will be notified via email or prominent notice on our platform.
              Review this page regularly for updates.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Contact Us
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related questions or to exercise your rights:
            </p>
            <div className="mt-4 text-muted-foreground">
              <p>SEFGH Privacy Team</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:privacy@sefgh.org"
                  className="text-primary hover:underline"
                >
                  privacy@sefgh.org
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
