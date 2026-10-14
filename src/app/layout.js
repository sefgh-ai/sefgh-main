import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import PageWrapper from "@/components/PageWrapper";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import CookieBar from "@/components/CookieBar";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { DynamicIslandNav } from "@/components/navigation/DynamicIslandNav";
import { Toaster } from "sonner";
import "./globals.css";


export const viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export const metadata = {
  title: "SEFGH - AI-Powered GitHub Repository Search",
  description:
    "Discover hidden GitHub gems with SEFGH's intelligent search. Go beyond keywords with natural language queries and find projects that truly match your needs. Perfect for developers, data scientists, and researchers.",
  keywords:
    "GitHub search tool, GitHub project discovery, smart GitHub search, find GitHub projects, GitHub repository search engine, discover GitHub gems, open source project finder",
  authors: [{ name: "SEFGH" }],
  creator: "SEFGH",
  publisher: "SEFGH",
  robots: "index, follow",
  metadataBase: new URL("https://sefgh.org"),
  alternates: {
    canonical: "https://sefgh.org/",
  },
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    url: "https://sefgh.org/",
    title:
      "SEFGH - Search Engine For Github, Smart GitHub Project Discovery Tool",
    description:
      "Discover hidden GitHub gems with SEFGH's intelligent search. Go beyond keywords with natural language queries and find projects that truly match your needs.",
    siteName: "SEFGH",
    images: [
      {
        url: "https://sefgh.org/assets/sefgh-social-preview.jpg",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@sefgh",
    creator: "@sefgh",
    title: "SEFGH - Search Engine For Github",
    description:
      "Discover hidden GitHub gems with SEFGH's intelligent search. Go beyond keywords with natural language queries and find projects that truly match your needs.",
    images: ["https://sefgh.org/assets/sefgh-social-preview.jpg"],
  },
  applicationName: "SEFGH",
  other: {
    "msapplication-TileColor": "#2563eb",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent flash of light theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var root = document.documentElement;
                  var stored = localStorage.getItem('sefgh-theme');
                  var theme = stored;
                  if (!theme || theme === 'system') {
                    theme = window.matchMedia('(prefers-color-scheme: light)').matches
                      ? (stored === 'system' ? 'light' : 'dark')
                      : 'dark';
                  }
                  root.classList.remove('light', 'dark');
                  root.classList.add(theme);
                } catch (e) {}
              })();
            `,
          }}
        />
        <link
          rel="sitemap"
          type="application/xml"
          title="Sitemap"
          href="/sitemap.xml"
        />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Apple PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="SEFGH" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/icons/icon-152x152.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/icon-192x192.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="167x167"
          href="/icons/icon-192x192.png"
        />

        {/* Microsoft PWA Meta Tags */}
        <meta
          name="msapplication-TileImage"
          content="/icons/icon-144x144.png"
        />
        <meta name="msapplication-config" content="none" />

        {/* Structured Data: Web Application */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "SEFGH",
              url: "https://sefgh.org",
              description:
                "A smart GitHub project discovery tool that helps developers find repositories using natural language queries and intelligent matching based on LLM'S Agentic Frameworks.",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web Browser",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              creator: {
                "@type": "Organization",
                name: "SEFGH",
                url: "https://sefgh.org",
              },
              featureList: [
                "Natural language GitHub search",
                "Multi-language project discovery",
                "Smart repository matching",
                "Hidden gem discovery",
                "Detailed project analysis",
                "Search Engine For Github",
              ],
            }),
          }}
        />

        {/* Structured Data: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "SEFGH",
              url: "https://sefgh.org",
              logo: "https://sefgh.org/assets/sefgh-logo.png",
              description:
                "SEFGH is a smart GitHub project discovery tool that helps developers find repositories using natural language queries.",
              foundingDate: "2025",
              sameAs: [
                "https://twitter.com/sefghai",
                "https://github.com/sefgh-ai",
              ],
            }),
          }}
        />
      </head>
      <body
        className="font-sans antialiased"
      >
        {/* Google Analytics: only after the visitor accepts (R-055). */}
        <GoogleAnalytics />
        <Script id="obelisk-loader" strategy="lazyOnload">
          {`
            (function() {
              const isLowPower = () => {
                const mq = window.matchMedia('(max-width: 768px)');
                const saveData = navigator?.connection?.saveData === true;
                const lowMemory = navigator?.deviceMemory && navigator.deviceMemory <= 2;
                const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                return mq.matches || saveData || lowMemory || reducedMotion;
              };

              if (isLowPower()) {
                console.info('Obelisk skipped on low-power/mobile');
                return;
              }

              const load = () => {
                if (document.querySelector('script[data-obelisk]')) return;
                const s = document.createElement('script');
                s.src = '/obelisk.min.js';
                s.async = true;
                s.dataset.obelisk = '1';
                document.body.appendChild(s);
              };

              if ('requestIdleCallback' in window) {
                window.requestIdleCallback(load, { timeout: 2000 });
              } else {
                setTimeout(load, 1200);
              }
            })();
          `}
        </Script>
        {/* Configuration lives in ThemeProvider; dark is the default. */}
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <SettingsProvider>
                <LanguageProvider>
                  <ServiceWorkerRegister />
                  <DynamicIslandNav />
                  <CookieBar />
                  <PageWrapper>{children}</PageWrapper>
                  <Toaster
                    position="top-right"
                    closeButton
                    expand={false}
                    duration={4000}
                    toastOptions={{
                      classNames: {
                        toast:
                          "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                        description: "group-[.toast]:text-muted-foreground",
                        // Primary fill with its paired foreground, so the label
                        // stays legible in both themes.
                        actionButton:
                          "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                        cancelButton:
                          "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                        closeButton:
                          "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:border-border",
                        success:
                          "group toast-success group-[.toaster]:border-success/30 [&_[data-icon]]:text-success",
                        error:
                          "group toast-error group-[.toaster]:border-destructive/30 [&_[data-icon]]:text-destructive",
                        warning:
                          "group toast-warning group-[.toaster]:border-warning/30 [&_[data-icon]]:text-warning",
                        info:
                          "group toast-info group-[.toaster]:border-info/30 [&_[data-icon]]:text-info",
                        loading: "group toast-loading",
                      },
                    }}
                  />
                </LanguageProvider>
              </SettingsProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
