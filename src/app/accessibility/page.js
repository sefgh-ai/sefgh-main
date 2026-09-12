"use client";

import Link from "next/link";
import AppFooter from "@/components/ui/app-footer";

export default function AccessibilityPage() {
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
        <h1 className="text-4xl font-bold text-white mb-4">
          Accessibility Statement
        </h1>
        <p className="text-slate-400 mb-8">Last Updated: January 8, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Our Commitment
            </h2>
            <p className="text-slate-300 leading-relaxed">
              SEFGH-AI is committed to ensuring digital accessibility for people
              with disabilities. We continually improve the user experience for
              everyone and apply relevant accessibility standards to guarantee
              we provide equal access to all users.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Conformance Status
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              We aim to conform to the{" "}
              <strong className="text-white">
                Web Content Accessibility Guidelines (WCAG) 2.1 Level AA
              </strong>
              . These guidelines explain how to make web content more accessible
              for people with disabilities and more user-friendly for everyone.
            </p>
            <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-4">
              <p className="text-slate-300">
                <strong className="text-white">Current Status:</strong>{" "}
                Partially conformant. We are actively working to achieve full
                conformance and address any gaps.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Accessibility Features
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              SEFGH-AI includes the following accessibility features:
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">
                  🎯 Keyboard Navigation
                </h3>
                <p className="text-slate-400 text-sm">
                  Full keyboard accessibility for all interactive elements. Use
                  Tab, Enter, and arrow keys to navigate.
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">
                  🖼️ Alternative Text
                </h3>
                <p className="text-slate-400 text-sm">
                  All images include descriptive alt text for screen readers.
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">
                  🎨 Color Contrast
                </h3>
                <p className="text-slate-400 text-sm">
                  Text and interactive elements meet WCAG AA contrast
                  requirements.
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">
                  📝 Semantic HTML
                </h3>
                <p className="text-slate-400 text-sm">
                  Proper heading hierarchy and semantic markup for screen reader
                  compatibility.
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">
                  🔍 Focus Indicators
                </h3>
                <p className="text-slate-400 text-sm">
                  Visible focus states on all interactive elements.
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">
                  📱 Responsive Design
                </h3>
                <p className="text-slate-400 text-sm">
                  Fully responsive layout that works on all device sizes and
                  orientations.
                </p>
              </div>
            </div>

            <h3 className="text-xl font-medium text-white mb-3">
              Additional Features
            </h3>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Skip to main content link for keyboard users</li>
              <li>ARIA labels on interactive components</li>
              <li>
                Form labels and error messages clearly associated with inputs
              </li>
              <li>
                Reduced motion support for users who prefer less animation
              </li>
              <li>Resizable text up to 200% without loss of functionality</li>
              <li>No content flashes more than 3 times per second</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Assistive Technology Compatibility
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              SEFGH-AI is designed to be compatible with:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>
                <strong className="text-white">Screen Readers:</strong> NVDA,
                JAWS, VoiceOver, TalkBack
              </li>
              <li>
                <strong className="text-white">Voice Control:</strong> Dragon
                NaturallySpeaking, Voice Control (macOS/iOS)
              </li>
              <li>
                <strong className="text-white">Magnification:</strong> ZoomText,
                built-in browser zoom
              </li>
              <li>
                <strong className="text-white">
                  Keyboard-only Navigation:
                </strong>{" "}
                Full functionality without a mouse
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Known Limitations
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              We are aware of some areas where accessibility can be improved:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>
                Some third-party embedded content may not be fully accessible
              </li>
              <li>
                Complex code syntax highlighting may need improvements for
                screen readers
              </li>
              <li>
                Some dynamic content updates may not be immediately announced
              </li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-4">
              We are actively working to address these issues and improve
              accessibility across all features.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Ongoing Improvements
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Our accessibility roadmap includes:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Regular accessibility audits (quarterly)</li>
              <li>User testing with people who use assistive technologies</li>
              <li>Staff training on accessibility best practices</li>
              <li>
                Integration of accessibility into our development workflow
              </li>
              <li>Continuous monitoring and remediation of issues</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Feedback & Assistance
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              We welcome your feedback on the accessibility of SEFGH-AI. If you
              encounter any barriers or have suggestions for improvement, please
              let us know:
            </p>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="font-semibold text-white mb-4">
                Contact for Accessibility Issues
              </h3>
              <ul className="text-slate-300 space-y-2">
                <li>
                  <strong className="text-white">Email:</strong>{" "}
                  <a
                    href="mailto:accessibility@sefgh.org"
                    className="text-blue-400 hover:underline"
                  >
                    accessibility@sefgh.org
                  </a>
                </li>
                <li>
                  <strong className="text-white">Response Time:</strong> We aim
                  to respond within 2 business days
                </li>
              </ul>
              <p className="text-slate-400 text-sm mt-4">
                When reporting an issue, please include:
              </p>
              <ul className="list-disc list-inside text-slate-400 text-sm space-y-1 ml-4 mt-2">
                <li>The page URL where you encountered the issue</li>
                <li>A description of the problem</li>
                <li>The assistive technology you use (if applicable)</li>
                <li>Your browser and operating system</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Alternative Formats
            </h2>
            <p className="text-slate-300 leading-relaxed">
              If you need information from our website in an alternative format,
              please contact us. We will work with you to provide the
              information in a format that meets your needs.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Legal & Compliance
            </h2>
            <p className="text-slate-300 leading-relaxed">
              This accessibility statement was prepared based on
              self-evaluation. We are committed to complying with applicable
              accessibility laws and regulations, including Section 508 of the
              Rehabilitation Act (US), the European Accessibility Act (EU), and
              the Accessibility for Ontarians with Disabilities Act (Canada).
            </p>
          </section>
        </div>
      </div>

      <AppFooter />
    </main>
  );
}
