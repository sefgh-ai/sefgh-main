"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import AppFooter from "@/components/ui/app-footer";
import {
  Building2,
  Rocket,
  Users,
  BarChart3,
  Shield,
  Headphones,
  ArrowLeft,
  ArrowRight,
  Mail,
  Briefcase,
  Globe,
  Zap,
} from "lucide-react";

export default function BusinessPage() {
  const solutions = [
    {
      icon: Rocket,
      title: "Startup Plans",
      description:
        "Perfect for early-stage companies building their tech stack. Get discounted rates and priority support.",
      features: [
        "Up to 10 team members",
        "5,000 API calls/month",
        "Email support",
        "Basic analytics",
      ],
    },
    {
      icon: Building2,
      title: "Enterprise",
      description:
        "For large organizations with complex needs. Custom solutions tailored to your requirements.",
      features: [
        "Unlimited team members",
        "Unlimited API calls",
        "24/7 dedicated support",
        "Custom integrations",
        "SLA guarantee",
      ],
    },
    {
      icon: Users,
      title: "Team Plans",
      description:
        "Ideal for growing teams who need collaboration features and shared workspaces.",
      features: [
        "Up to 50 team members",
        "25,000 API calls/month",
        "Priority support",
        "Team analytics",
        "SSO integration",
      ],
    },
  ];

  const benefits = [
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description:
        "Get detailed insights into your team's search patterns and repository discovery metrics.",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description:
        "SOC 2 compliant with advanced security features including SSO, audit logs, and data encryption.",
    },
    {
      icon: Headphones,
      title: "Dedicated Support",
      description:
        "Get a dedicated account manager and priority support with guaranteed response times.",
    },
    {
      icon: Globe,
      title: "Global Infrastructure",
      description:
        "Lightning-fast searches powered by our globally distributed infrastructure.",
    },
  ];

  const useCases = [
    {
      title: "Developer Teams",
      description:
        "Help your developers find the right libraries and tools faster, reducing research time by up to 70%.",
    },
    {
      title: "Open Source Programs",
      description:
        "Discover and track open source projects relevant to your organization's tech stack.",
    },
    {
      title: "Tech Due Diligence",
      description:
        "Evaluate technology stacks and open source dependencies for investment decisions.",
    },
    {
      title: "Recruitment",
      description:
        "Find talented developers by analyzing their open source contributions.",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            SEFGH<span className="text-primary">-AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/home">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="sm">Contact Sales</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 sm:py-24 border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Briefcase className="w-4 h-4" />
            For Business
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Power Your Team with
            <br />
            <span className="text-primary">Smarter Search</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            SEFGH for Business helps teams discover, evaluate, and adopt open
            source projects faster. Reduce research time and make better
            technology decisions.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="gap-2">
                Talk to Sales
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Solutions for Every Team Size
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you&apos;re a startup or enterprise, we have a plan that
              fits your needs.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {solutions.map((solution) => (
              <Card key={solution.title} className="relative overflow-hidden">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <solution.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{solution.title}</CardTitle>
                  <CardDescription>{solution.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {solution.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Zap className="w-4 h-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/contact">
                    <Button variant="outline" className="w-full mt-6">
                      Learn More
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-20 bg-muted/30 border-y">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Enterprise-Grade Features
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for teams that need reliability, security, and scale.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-background border flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Use Cases</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See how teams are using SEFGH to work smarter.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {useCases.map((useCase) => (
              <Card key={useCase.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{useCase.title}</CardTitle>
                  <CardDescription>{useCase.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Contact our sales team to learn how SEFGH can help your
            organization.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="gap-2">
                <Mail className="w-4 h-4" />
                Contact Sales
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
