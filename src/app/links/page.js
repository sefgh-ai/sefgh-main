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
  Github,
  Twitter,
  Linkedin,
  Mail,
  FileText,
  BookOpen,
  Code,
  MessageCircle,
  Rss,
  Youtube,
  ArrowLeft,
  ExternalLink,
  Heart,
} from "lucide-react";

export default function LinksPage() {
  const socialLinks = [
    {
      icon: Github,
      name: "GitHub",
      description: "Check out our open source projects",
      url: "https://github.com/sefgh-ai",
      color: "hover:text-foreground",
    },
    {
      icon: Twitter,
      name: "Twitter / X",
      description: "Follow us for updates and tips",
      url: "https://twitter.com/sefgh_ai",
      color: "hover:text-sky-500",
    },
    {
      icon: Linkedin,
      name: "LinkedIn",
      description: "Connect with us professionally",
      url: "https://linkedin.com/company/sefgh-ai",
      color: "hover:text-blue-600",
    },
    {
      icon: Youtube,
      name: "YouTube",
      description: "Watch tutorials and demos",
      url: "https://youtube.com/@sefgh-ai",
      color: "hover:text-red-500",
    },
    {
      icon: MessageCircle,
      name: "Discord",
      description: "Join our community",
      url: "https://discord.gg/sefgh",
      color: "hover:text-indigo-500",
    },
    {
      icon: Rss,
      name: "Blog RSS",
      description: "Subscribe to our blog feed",
      url: "/blog/rss.xml",
      color: "hover:text-orange-500",
    },
  ];

  const resourceLinks = [
    {
      icon: BookOpen,
      name: "Documentation",
      description: "Learn how to use SEFGH effectively",
      url: "/docs",
    },
    {
      icon: Code,
      name: "API Reference",
      description: "Integrate SEFGH into your applications",
      url: "/docs/api",
    },
    {
      icon: FileText,
      name: "Blog",
      description: "Read our latest articles and updates",
      url: "/blog",
    },
    {
      icon: Heart,
      name: "Changelog",
      description: "See what's new in SEFGH",
      url: "/changelog",
    },
  ];

  const legalLinks = [
    { name: "Privacy Policy", url: "/privacy" },
    { name: "Terms of Service", url: "/terms" },
    { name: "Cookie Policy", url: "/cookie-policy" },
    { name: "Terms of Use", url: "/terms-of-use" },
    { name: "Accessibility", url: "/accessibility" },
  ];

  const companyLinks = [
    { name: "About Us", url: "/about" },
    { name: "Careers", url: "/careers" },
    { name: "Contact", url: "/contact" },
    { name: "Pricing", url: "/pricing" },
    { name: "Business", url: "/business" },
    { name: "Brand Assets", url: "/brand" },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            SEFGH<span className="text-primary">-AI</span>
          </Link>
          <Link href="/home">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 sm:py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Links & Resources
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find all the important links to connect with us, explore our
            resources, and stay updated.
          </p>
        </div>
      </section>

      {/* Social Links */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold mb-6">Connect With Us</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg bg-muted transition-colors ${link.color}`}
                    >
                      <link.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{link.name}</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-12 bg-muted/30 border-y">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold mb-6">Resources</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {resourceLinks.map((link) => (
              <Link key={link.name} href={link.url}>
                <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <link.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium">{link.name}</span>
                      <p className="text-sm text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Company & Legal Links */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 gap-8">
            {/* Company */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Company</h2>
              <div className="space-y-2">
                {companyLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.url}
                    className="block py-2 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Legal</h2>
              <div className="space-y-2">
                {legalLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.url}
                    className="block py-2 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-12 border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="text-muted-foreground mb-6">
            Reach out to us and we&apos;ll be happy to help.
          </p>
          <Link href="/contact">
            <Button size="lg" className="gap-2">
              <Mail className="w-4 h-4" />
              Contact Us
            </Button>
          </Link>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
