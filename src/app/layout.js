import { Inter, JetBrains_Mono } from "next/font/google";
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
import { DynamicIslandNav } from "@/components/navigation/DynamicIslandNav";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "600"],
  display: "swap",
  preload: false,
});

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Prevent flash of light theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('sefgh-theme') || 'dark';
                  document.documentElement.classList.add(theme);
                  document.documentElement.style.colorScheme = theme;
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
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
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-3J37CNB3YE"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            if (navigator?.doNotTrack === '1') {
              console.info('GA disabled by DNT');
            } else {
              const runGA = () => {
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-3J37CNB3YE');
              };
              if ('requestIdleCallback' in window) {
                window.requestIdleCallback(runGA, { timeout: 2000 });
              } else {
                setTimeout(runGA, 1200);
              }
            }
          `}
        </Script>
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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
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
                          "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                        description:
                          "group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400",
                        actionButton:
                          "group-[.toast]:bg-slate-900 dark:group-[.toast]:bg-slate-50 group-[.toast]:text-slate-50 dark:group-[.toast]:text-slate-900",
                        cancelButton:
                          "group-[.toast]:bg-slate-100 dark:group-[.toast]:bg-slate-800 group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400",
                        closeButton:
                          "group-[.toast]:bg-slate-100 dark:group-[.toast]:bg-slate-800 group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400 group-[.toast]:border-slate-200 dark:group-[.toast]:border-slate-700",
                        success:
                          "group toast-success group-[.toaster]:bg-emerald-50 dark:group-[.toaster]:bg-emerald-950 group-[.toaster]:text-emerald-900 dark:group-[.toaster]:text-emerald-50 group-[.toaster]:border-emerald-200 dark:group-[.toaster]:border-emerald-800",
                        error:
                          "group toast-error group-[.toaster]:bg-red-50 dark:group-[.toaster]:bg-red-950 group-[.toaster]:text-red-900 dark:group-[.toaster]:text-red-50 group-[.toaster]:border-red-200 dark:group-[.toaster]:border-red-800",
                        warning:
                          "group toast-warning group-[.toaster]:bg-yellow-50 dark:group-[.toaster]:bg-yellow-950 group-[.toaster]:text-yellow-900 dark:group-[.toaster]:text-yellow-50 group-[.toaster]:border-yellow-200 dark:group-[.toaster]:border-yellow-800",
                        info: "group toast-info group-[.toaster]:bg-blue-50 dark:group-[.toaster]:bg-blue-950 group-[.toaster]:text-blue-900 dark:group-[.toaster]:text-blue-50 group-[.toaster]:border-blue-200 dark:group-[.toaster]:border-blue-800",
                        loading:
                          "group toast-loading group-[.toaster]:bg-slate-50 dark:group-[.toaster]:bg-slate-900 group-[.toaster]:text-slate-900 dark:group-[.toaster]:text-slate-50 group-[.toaster]:border-slate-200 dark:group-[.toaster]:border-slate-700",
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
