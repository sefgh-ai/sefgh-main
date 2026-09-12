"use client";

import { useState } from "react";
import Link from "next/link";
import AppFooter from "@/components/ui/app-footer";
import { Check, Sparkles, Zap, Building2, HelpCircle } from "lucide-react";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState("monthly");

  const plans = [
    {
      name: "Free",
      description: "Perfect for trying out SEFGH-AI",
      price: { monthly: 0, annual: 0 },
      icon: Sparkles,
      color: "slate",
      features: [
        "100 searches per month",
        "Basic semantic search",
        "Search history (7 days)",
        "Community support",
        "Standard response time",
      ],
      limitations: [
        "No AI chat assistant",
        "No API access",
        "No priority support",
      ],
      cta: "Get Started",
      ctaLink: "/signup",
      popular: false,
    },
    {
      name: "Pro",
      description: "For individual developers & power users",
      price: { monthly: 19, annual: 15 },
      icon: Zap,
      color: "blue",
      features: [
        "Unlimited searches",
        "Advanced AI semantic search",
        "AI code assistant (500 messages/mo)",
        "Search history (unlimited)",
        "API access (10K requests/mo)",
        "Priority email support",
        "Export search results",
        "Custom search filters",
      ],
      limitations: [],
      cta: "Start Free Trial",
      ctaLink: "/signup?plan=pro",
      popular: true,
    },
    {
      name: "Team",
      description: "For teams collaborating on projects",
      price: { monthly: 49, annual: 39 },
      icon: Building2,
      color: "teal",
      features: [
        "Everything in Pro",
        "Up to 10 team members",
        "AI code assistant (unlimited)",
        "API access (100K requests/mo)",
        "Team shared collections",
        "Analytics dashboard",
        "Priority chat support",
        "SSO integration",
        "Admin controls",
      ],
      limitations: [],
      cta: "Start Free Trial",
      ctaLink: "/signup?plan=team",
      popular: false,
    },
  ];

  const faqs = [
    {
      q: "Can I switch plans anytime?",
      a: "Yes! Upgrade or downgrade anytime. Changes take effect immediately, and we'll prorate any charges.",
    },
    {
      q: "Is there a free trial for paid plans?",
      a: "Yes, Pro and Team plans include a 14-day free trial. No credit card required to start.",
    },
    {
      q: "What happens if I exceed my limits?",
      a: "We'll notify you before you hit limits. You can upgrade or wait for the next billing cycle—we won't cut off access abruptly.",
    },
    {
      q: "Do you offer discounts for startups or students?",
      a: "Yes! Contact us with verification for 50% off Pro plans for students and early-stage startups.",
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept all major credit cards, PayPal, and can arrange invoicing for Enterprise plans.",
    },
  ];

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
            <Link href="/pricing" className="text-white transition-colors">
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

      {/* Hero */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            Start free, upgrade when you need more. Cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 bg-slate-800/50 rounded-full p-1.5">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === "annual"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Annual <span className="text-emerald-400 ml-1">Save 20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-slate-800/50 border rounded-2xl p-8 ${
                plan.popular
                  ? "border-blue-500 shadow-lg shadow-blue-500/20"
                  : "border-slate-700"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm font-medium rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    plan.color === "blue"
                      ? "bg-blue-600/20"
                      : plan.color === "teal"
                      ? "bg-teal-600/20"
                      : "bg-slate-700/50"
                  }`}
                >
                  <plan.icon
                    className={`w-6 h-6 ${
                      plan.color === "blue"
                        ? "text-blue-400"
                        : plan.color === "teal"
                        ? "text-teal-400"
                        : "text-slate-400"
                    }`}
                  />
                </div>
                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                <p className="text-slate-400 mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">
                    ${plan.price[billingCycle]}
                  </span>
                  {plan.price[billingCycle] > 0 && (
                    <span className="text-slate-400">/month</span>
                  )}
                </div>
                {billingCycle === "annual" && plan.price.monthly > 0 && (
                  <p className="text-sm text-emerald-400 mt-1">
                    Billed ${plan.price.annual * 12}/year
                  </p>
                )}
              </div>

              <Link
                href={plan.ctaLink}
                className={`block w-full py-3 px-6 rounded-lg font-semibold text-center transition-all mb-8 ${
                  plan.popular
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg"
                    : "bg-slate-700 hover:bg-slate-600 text-white"
                }`}
              >
                {plan.cta}
              </Link>

              <div className="space-y-3">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </div>
                ))}
                {plan.limitations.map((limitation, i) => (
                  <div key={i} className="flex items-start gap-3 opacity-50">
                    <span className="w-5 h-5 text-slate-500 shrink-0 mt-0.5 text-center">
                      —
                    </span>
                    <span className="text-slate-500 text-sm">{limitation}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-950/50 to-teal-950/50 border border-slate-700 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Need a custom Enterprise solution?
            </h2>
            <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
              Get unlimited everything, dedicated support, custom integrations,
              SLA guarantees, and on-premise deployment options.
            </p>
            <Link
              href="/contact?subject=enterprise"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-all"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-6"
              >
                <div className="flex items-start gap-4">
                  <HelpCircle className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-white font-semibold mb-2">{faq.q}</h3>
                    <p className="text-slate-400">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Money Back Guarantee */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-950/50 border border-emerald-900/50 rounded-full text-emerald-400 text-sm mb-4">
            <Check className="w-4 h-4" />
            30-Day Money-Back Guarantee
          </div>
          <p className="text-slate-400">
            Not satisfied? Get a full refund within 30 days, no questions asked.
          </p>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
