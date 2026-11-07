"use client";

import Link from "next/link";
import Image from "next/image";
import AppFooter from "@/components/ui/app-footer";
import { UsersIcon, LightningIcon, CodeIcon, HeartIcon } from "@phosphor-icons/react";

export default function AboutPage() {
  const milestones = [
    {
      year: "2024",
      title: "Founded",
      description:
        "SEFGH-AI launched with a mission to revolutionize GitHub discovery",
    },
    {
      year: "2024",
      title: "10K Users",
      description: "Reached first major user milestone within 6 months",
    },
    {
      year: "2025",
      title: "AI Integration",
      description: "Launched advanced AI-powered semantic search",
    },
    {
      year: "2025",
      title: "API Launch",
      description: "Released public API for developers",
    },
    {
      year: "2026",
      title: "100K+ Searches",
      description: "Processing over 100,000 searches monthly",
    },
  ];

  const values = [
    {
      icon: CodeIcon,
      title: "Developer-First",
      description:
        "Every feature is designed with developers in mind. We build tools we want to use ourselves.",
    },
    {
      icon: LightningIcon,
      title: "Speed & Efficiency",
      description:
        "Find the right repository in seconds, not hours. Your time is valuable.",
    },
    {
      icon: HeartIcon,
      title: "Open Source Love",
      description:
        "We champion open source and help surface hidden gems that deserve recognition.",
    },
    {
      icon: UsersIcon,
      title: "Community Driven",
      description:
        "Our roadmap is shaped by user feedback. We build what you need.",
    },
  ];

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
            <Link href="/about" className="text-foreground transition-colors">
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

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Empowering Developers to{" "}
            <span className="text-primary">Discover</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            SEFGH-AI is on a mission to revolutionize how developers find open
            source projects. We believe the best code shouldn&apos;t stay hidden—it
            should be discovered.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Our Story
          </h2>
          <div className="prose prose-invert prose-slate max-w-none">
            <p className="text-muted-foreground leading-relaxed text-lg mb-6">
              SEFGH (Search Engine For GitHub) was born from frustration. As
              developers ourselves, we spent countless hours sifting through
              GitHub&apos;s millions of repositories, often missing brilliant
              projects simply because they didn&apos;t have the right keywords or
              enough stars.
            </p>
            <p className="text-muted-foreground leading-relaxed text-lg mb-6">
              In 2024, we set out to build something different—a search engine
              that understands developer intent, not just keywords. Using
              advanced AI and natural language processing, SEFGH-AI interprets
              what you&apos;re looking for and surfaces repositories that truly match
              your needs.
            </p>
            <p className="text-muted-foreground leading-relaxed text-lg">
              Today, SEFGH-AI helps thousands of developers, data scientists,
              and researchers discover hidden gems in the open source ecosystem.
              Whether you&apos;re looking for a specific library, exploring new
              technologies, or finding inspiration for your next project, we&apos;re
              here to help you find it faster.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
            What We Stand For
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-muted/50 border border-border rounded-xl p-6 hover:border-blue-500/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-teal-600 flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
            Our Journey
          </h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-muted transform md:-translate-x-1/2"></div>

            {milestones.map((milestone, index) => (
              <div
                key={`${milestone.year}-${milestone.title}`}
                className={`relative flex items-center mb-8 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Timeline dot */}
                <div className="absolute left-4 md:left-1/2 w-3 h-3 bg-primary rounded-full transform md:-translate-x-1/2 z-10"></div>

                {/* Content */}
                <div
                  className={`ml-12 md:ml-0 md:w-1/2 ${
                    index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"
                  }`}
                >
                  <div className="bg-muted/50 border border-border rounded-lg p-4 inline-block">
                    <span className="text-primary font-semibold">
                      {milestone.year}
                    </span>
                    <h3 className="text-foreground font-semibold mt-1">
                      {milestone.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                100K+
              </div>
              <div className="text-muted-foreground">Monthly Searches</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-teal-500 mb-2">
                50K+
              </div>
              <div className="text-muted-foreground">Active Users</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-purple-500 mb-2">
                99.9%
              </div>
              <div className="text-muted-foreground">Uptime</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-orange-500 mb-2">
                10M+
              </div>
              <div className="text-muted-foreground">Repos Indexed</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to discover your next project?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of developers using SEFGH-AI to find the perfect open
            source projects.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-lg transition-all shadow-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/search"
              className="px-8 py-4 bg-muted hover:bg-muted text-foreground font-semibold rounded-lg transition-all border border-border"
            >
              Try Search Now
            </Link>
          </div>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
