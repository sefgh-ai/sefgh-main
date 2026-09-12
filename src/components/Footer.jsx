"use client";

import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { href: "/status", label: "Status" },
    { href: "/news", label: "Release Notes" },
    { href: "/research", label: "Research" },
    { href: "/sitemap-preview", label: "Sitemap" },
    { href: "/downloads", label: "Downloads" },
    { href: "/playground", label: "Playground" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms-of-use", label: "Terms" },
    { href: "/cookie-policy", label: "Cookies" },
  ];

  return (
    <footer className="w-full py-3 px-4 border-t border-border/40 bg-background/80 backdrop-blur-sm z-10 shrink-0">
      <div className="mx-auto max-w-7xl">
        {/* Single line layout */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground flex-wrap">
          {/* Copyright */}
          <span className="whitespace-nowrap">© {currentYear} SEFGH, Inc.</span>

          {/* Separator */}
          <span className="text-muted-foreground/50">•</span>

          {/* Links */}
          {footerLinks.map((link, index) => (
            <div key={link.label} className="flex items-center gap-2">
              <Link
                href={link.href}
                className="hover:text-foreground transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
              {index < footerLinks.length - 1 && (
                <span className="text-muted-foreground/50">•</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
