import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://api.github.com https://vitals.vercel-insights.com https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

// API routes the Go backend can serve instead of their Next.js handlers.
// Nothing is forwarded unless SEFGH_GO_API_URL is set and the route's name
// is listed in SEFGH_GO_ROUTES (comma-separated). Both are read at build
// time. Unsetting them is the rollback. See backend/README.md.
const goBackendRoutes = {
  "github-search": "/api/github/search",
  "github-languages": "/api/github/languages",
  "github-trending": "/api/github/trending",
  "github-trending-developers": "/api/github/trending-developers",
  "github-contributions": "/api/github/contributions",
  "github-repo": "/api/github/repo",
  "github-repo-details": "/api/github/repo/:owner/:repo",
  "github-contents": "/api/github/contents/:owner/:repo",
  "ai-suggestions": "/api/ai/suggestions",
  "ai-enhance-query": "/api/ai/enhance-query",
  // Go accepts a Supabase bearer only, not the session cookie Next.js reads.
  // The browser sends the bearer (src/lib/ai/chat-request.js).
  "ai-chat": "/api/ai/chat",
};

function goBackendRewrites() {
  const origin = (process.env.SEFGH_GO_API_URL || "").replace(/\/+$/, "");
  if (!origin) return [];
  const enabled = (process.env.SEFGH_GO_ROUTES || "")
    .split(",")
    .map((name) => name.trim());
  return Object.entries(goBackendRoutes)
    .filter(([name]) => enabled.includes(name))
    .map(([, path]) => ({ source: path, destination: `${origin}${path}` }));
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The local production forwarding probe must not replace a developer's build.
  distDir: process.env.SEFGH_FORWARDING_PROBE === '1' ? '.next-forwarding-probe' : '.next',
  reactCompiler: false, // Disabled - causing 50s+ compile times
  compress: true,
  poweredByHeader: false,

  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  // beforeFiles rewrites run before route handlers, so an enabled route is
  // served by Go even though its route.js still exists.
  async rewrites() {
    return { beforeFiles: goBackendRewrites() };
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
        port: "",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Turbopack config moved out of `experimental` in Next.js 16.
  turbopack: {
    root: __dirname,
  },

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@radix-ui/react-icons',
      '@heroicons/react',
      'sonner',
      '@react-three/fiber',
      '@react-three/drei',
      'three',
      'framer-motion',
    ],
  },
};

export default nextConfig;
