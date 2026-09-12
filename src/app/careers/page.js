"use client";

import { useState } from "react";
import Link from "next/link";
import AppFooter from "@/components/ui/app-footer";
import {
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Heart,
  Globe,
  Users,
  Sparkles,
  ChevronRight,
  Building2,
  GraduationCap,
  Coffee,
} from "lucide-react";

export default function CareersPage() {
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  const benefits = [
    {
      icon: Globe,
      title: "Remote-First",
      description: "Work from anywhere in the world",
    },
    {
      icon: Heart,
      title: "Health Insurance",
      description: "Comprehensive medical, dental, vision",
    },
    {
      icon: DollarSign,
      title: "Competitive Pay",
      description: "Top-tier salary + equity options",
    },
    {
      icon: Clock,
      title: "Flexible Hours",
      description: "Async-friendly, work when productive",
    },
    {
      icon: GraduationCap,
      title: "Learning Budget",
      description: "$2,000/year for courses & conferences",
    },
    {
      icon: Coffee,
      title: "Home Office Setup",
      description: "$1,500 stipend for your workspace",
    },
  ];

  const openings = [
    {
      id: 1,
      title: "Senior Full-Stack Engineer",
      department: "Engineering",
      location: "Remote (US/EU)",
      type: "Full-time",
      salary: "$140K - $180K",
      description:
        "Build and scale our AI-powered search platform using Next.js, Python, and modern cloud infrastructure.",
      requirements: [
        "5+ years experience with React/Next.js and Node.js or Python",
        "Experience with PostgreSQL, Redis, and cloud services (AWS/GCP/Vercel)",
        "Strong understanding of API design and distributed systems",
        "Bonus: Experience with AI/ML systems or vector databases",
      ],
    },
    {
      id: 2,
      title: "Machine Learning Engineer",
      department: "Engineering",
      location: "Remote (Worldwide)",
      type: "Full-time",
      salary: "$150K - $200K",
      description:
        "Improve our semantic search models and build new AI-powered features for code understanding.",
      requirements: [
        "3+ years experience in ML/NLP, preferably with code/text understanding",
        "Proficiency in Python, PyTorch/TensorFlow, and transformer models",
        "Experience with embeddings, RAG systems, and vector search",
        "Published research or open source contributions preferred",
      ],
    },
    {
      id: 3,
      title: "Product Designer",
      department: "Design",
      location: "Remote (US/EU)",
      type: "Full-time",
      salary: "$120K - $160K",
      description:
        "Design intuitive, beautiful experiences for developers searching and discovering code.",
      requirements: [
        "4+ years product design experience, preferably in developer tools",
        "Strong portfolio showing end-to-end design process",
        "Proficiency in Figma, prototyping, and design systems",
        "Understanding of accessibility and responsive design",
      ],
    },
    {
      id: 4,
      title: "Developer Advocate",
      department: "Marketing",
      location: "Remote (Worldwide)",
      type: "Full-time",
      salary: "$100K - $140K",
      description:
        "Be the voice of SEFGH-AI in the developer community. Create content, give talks, and build relationships.",
      requirements: [
        "Strong technical background (software engineering experience)",
        "Excellent written and verbal communication skills",
        "Active presence in developer communities (Twitter, GitHub, YouTube)",
        "Experience creating technical content (blogs, videos, talks)",
      ],
    },
    {
      id: 5,
      title: "Customer Success Manager",
      department: "Operations",
      location: "Remote (Americas)",
      type: "Full-time",
      salary: "$80K - $110K",
      description:
        "Help our users succeed with SEFGH-AI. Onboard new customers, provide support, and gather feedback.",
      requirements: [
        "2+ years in customer success, support, or account management",
        "Technical aptitude—comfortable with developer tools and APIs",
        "Excellent communication and problem-solving skills",
        "Experience with SaaS products and CRM tools",
      ],
    },
  ];

  const departments = [
    "all",
    "Engineering",
    "Design",
    "Marketing",
    "Operations",
  ];

  const filteredOpenings =
    selectedDepartment === "all"
      ? openings
      : openings.filter((job) => job.department === selectedDepartment);

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

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Build the Future of{" "}
            <span className="text-primary">Code Discovery</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            Join a small, talented team working on AI-powered tools that help
            developers find and understand code. Remote-first, impact-driven,
            and developer-focused.
          </p>
          <a
            href="#openings"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-lg transition-all shadow-lg"
          >
            View Open Positions
            <ChevronRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Culture Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why Work at SEFGH?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We&apos;re building something meaningful and we want you to be part of
              it.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                High Impact
              </h3>
              <p className="text-muted-foreground">
                Small team = big ownership. Your work directly shapes the
                product used by thousands of developers.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-teal-600/20 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-teal-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Great Team
              </h3>
              <p className="text-muted-foreground">
                Work with talented, kind people who value collaboration over
                ego. No brilliant jerks allowed.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-600/20 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Sustainable Pace
              </h3>
              <p className="text-muted-foreground">
                We believe in sustainable work. No crunch culture, no burnout.
                Life comes first.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Benefits & Perks
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-muted/50 border border-border rounded-xl p-6 hover:border-border transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section
        id="openings"
        className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/50"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-4">
            Open Positions
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            {openings.length} open roles across {departments.length - 1} teams
          </p>

          {/* Department Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedDepartment === dept
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-muted-foreground hover:text-white hover:bg-muted"
                }`}
              >
                {dept === "all" ? "All Roles" : dept}
              </button>
            ))}
          </div>

          {/* Job Listings */}
          <div className="space-y-6">
            {filteredOpenings.map((job) => (
              <div
                key={job.id}
                className="bg-muted/50 border border-border rounded-xl p-6 md:p-8 hover:border-border transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Briefcase className="w-4 h-4" /> {job.department}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-4 h-4" /> {job.location}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" /> {job.type}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <DollarSign className="w-4 h-4" /> {job.salary}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`mailto:careers@sefgh.org?subject=Application: ${job.title}`}
                    className="shrink-0 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all"
                  >
                    Apply Now
                  </Link>
                </div>

                <p className="text-muted-foreground mb-4">{job.description}</p>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">
                    Requirements:
                  </h4>
                  <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
                    {job.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {filteredOpenings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No open positions in this department right now.
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Check back soon or send a general application to{" "}
                <a
                  href="mailto:careers@sefgh.org"
                  className="text-primary hover:underline"
                >
                  careers@sefgh.org
                </a>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Diversity Statement */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Diversity & Inclusion
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            SEFGH is committed to building a diverse and inclusive team. We
            welcome applicants of all backgrounds regardless of race, gender,
            sexual orientation, religion, national origin, disability, or age.
            We believe diverse perspectives make better products.
          </p>
          <p className="text-muted-foreground text-sm mt-4">
            Don&apos;t see a perfect fit? Send your resume to{" "}
            <a
              href="mailto:careers@sefgh.org"
              className="text-primary hover:underline"
            >
              careers@sefgh.org
            </a>{" "}
            — we&apos;re always looking for great people.
          </p>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
