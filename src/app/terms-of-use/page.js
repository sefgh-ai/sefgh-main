"use client";

import Link from "next/link";
import AppFooter from "@/components/ui/app-footer";

export default function TermsOfUsePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            SEFGH<span className="text-blue-500">-AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              href="/search"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-slate-400 hover:text-white transition-colors"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-white mb-4">Terms of Use</h1>
        <p className="text-slate-400 mb-8">
          Effective Date: January 8, 2026 | Last Updated: January 8, 2026
        </p>

        <div className="prose prose-invert prose-slate max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-slate-300 leading-relaxed">
              These Terms of Use govern your access to and use of SEFGH-AI&apos;s
              platform, including our website, APIs, and all related services.
              By using SEFGH-AI, you confirm that you are at least 18 years old
              (or have parental consent) and agree to comply with these terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              2. Account Registration
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              To access certain features, you must create an account. You agree
              to:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Provide truthful and accurate registration information</li>
              <li>Use a valid email address that you have access to</li>
              <li>Create a strong, unique password</li>
              <li>Not share your account credentials with others</li>
              <li>Not create multiple accounts for abusive purposes</li>
              <li>Notify us immediately if you suspect unauthorized access</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              3. Acceptable Use Policy
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              <strong className="text-white">You MAY use SEFGH-AI to:</strong>
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4 mb-6">
              <li>
                Search and discover GitHub repositories for legitimate purposes
              </li>
              <li>
                Use our AI assistant for coding help and development queries
              </li>
              <li>Explore trending projects and code examples</li>
              <li>
                Access our API within documented rate limits (with valid
                subscription)
              </li>
              <li>Share and collaborate on discovered repositories</li>
            </ul>

            <p className="text-slate-300 leading-relaxed mb-4">
              <strong className="text-white">You MAY NOT:</strong>
            </p>
            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
              <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                <li>
                  Attempt to gain unauthorized access to our systems or other
                  user accounts
                </li>
                <li>
                  Use automated scripts, bots, or scrapers without explicit
                  permission
                </li>
                <li>
                  Reverse engineer, decompile, or disassemble any part of our
                  Service
                </li>
                <li>
                  Resell, redistribute, or commercially exploit our Service
                  without authorization
                </li>
                <li>
                  Circumvent rate limits, authentication, or security measures
                </li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>
                  Use the Service for illegal activities or to violate others&apos;
                  rights
                </li>
                <li>Harass, abuse, or harm other users</li>
                <li>Impersonate SEFGH staff or other users</li>
                <li>
                  Use our AI features to generate harmful, misleading, or
                  illegal content
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              4. API Usage
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              If you access our API:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>
                <strong className="text-white">Rate Limits:</strong> Respect the
                rate limits for your subscription tier
              </li>
              <li>
                <strong className="text-white">Authentication:</strong> Keep
                your API keys secure; never expose them publicly
              </li>
              <li>
                <strong className="text-white">Attribution:</strong> Include
                appropriate attribution when displaying our data
              </li>
              <li>
                <strong className="text-white">No Caching:</strong> Do not cache
                data beyond documented guidelines
              </li>
              <li>
                <strong className="text-white">Updates:</strong> We may modify
                the API; check documentation for changes
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              5. User Content
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              When you submit content (search queries, feedback, project
              submissions):
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>You retain ownership of your original content</li>
              <li>
                You grant us a license to use, process, and display your content
                to provide the Service
              </li>
              <li>You confirm you have rights to submit the content</li>
              <li>We may remove content that violates these Terms</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              6. Service Availability
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              We strive for high availability:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>
                <strong className="text-white">Uptime Target:</strong> 99.9%
                uptime for paid plans
              </li>
              <li>
                <strong className="text-white">Maintenance:</strong> Scheduled
                maintenance announced in advance when possible
              </li>
              <li>
                <strong className="text-white">No Guarantee:</strong> We don&apos;t
                guarantee uninterrupted access
              </li>
              <li>
                <strong className="text-white">
                  Third-Party Dependencies:
                </strong>{" "}
                Some features depend on GitHub&apos;s availability
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              7. Termination
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              <strong className="text-white">By You:</strong> You may delete
              your account at any time through account settings or by contacting
              support.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              <strong className="text-white">By Us:</strong> We may suspend or
              terminate your access if you:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Violate these Terms of Use</li>
              <li>Engage in fraudulent or illegal activity</li>
              <li>Abuse our Service or other users</li>
              <li>Fail to pay for subscription services</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-4">
              Upon termination, your right to use the Service ends immediately.
              Data may be retained as required by law or for legitimate business
              purposes.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              8. Indemnification
            </h2>
            <p className="text-slate-300 leading-relaxed">
              You agree to indemnify and hold harmless SEFGH, its officers,
              directors, employees, and agents from any claims, damages, losses,
              or expenses (including legal fees) arising from your use of the
              Service or violation of these Terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              9. Modifications
            </h2>
            <p className="text-slate-300 leading-relaxed">
              We reserve the right to modify these Terms of Use at any time. We
              will notify users of significant changes via email or platform
              notification. Your continued use after modifications constitutes
              acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              10. Contact
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Questions or concerns about these Terms of Use? Contact us:
            </p>
            <div className="mt-4 text-slate-300">
              <p>
                Email:{" "}
                <a
                  href="mailto:support@sefgh.org"
                  className="text-blue-400 hover:underline"
                >
                  support@sefgh.org
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
