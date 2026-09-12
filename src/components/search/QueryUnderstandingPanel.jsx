"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Code,
  Lightbulb,
  Layers,
} from "lucide-react";

// Common programming languages for detection
const LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "rust",
  "go",
  "java",
  "c++",
  "c#",
  "csharp",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "scala",
  "elixir",
  "clojure",
  "haskell",
  "ocaml",
  "f#",
  "dart",
  "lua",
  "perl",
  "r",
  "julia",
  "zig",
  "nim",
  "crystal",
  "vue",
  "react",
  "angular",
  "svelte",
  "nextjs",
  "next.js",
  "nuxt",
  "node",
  "nodejs",
  "deno",
  "bun",
  "sql",
  "graphql",
  "html",
  "css",
  "sass",
  "tailwind",
];

// Use case patterns
const USE_CASES = {
  authentication: [
    "auth",
    "login",
    "signup",
    "oauth",
    "jwt",
    "session",
    "passport",
    "credential",
  ],
  "api development": [
    "api",
    "rest",
    "graphql",
    "endpoint",
    "server",
    "backend",
    "route",
  ],
  database: [
    "database",
    "db",
    "orm",
    "sql",
    "postgres",
    "mysql",
    "mongo",
    "redis",
    "prisma",
    "drizzle",
  ],
  "ui/frontend": [
    "ui",
    "component",
    "frontend",
    "dashboard",
    "form",
    "button",
    "modal",
    "layout",
  ],
  "cli tool": ["cli", "command", "terminal", "shell", "console", "argv"],
  "web scraping": ["scrape", "scraper", "crawl", "crawler", "parse", "extract"],
  "machine learning": [
    "ml",
    "ai",
    "model",
    "neural",
    "tensorflow",
    "pytorch",
    "training",
  ],
  devops: [
    "docker",
    "kubernetes",
    "k8s",
    "ci",
    "cd",
    "deploy",
    "pipeline",
    "container",
  ],
  testing: [
    "test",
    "spec",
    "jest",
    "mocha",
    "pytest",
    "unittest",
    "e2e",
    "integration",
  ],
  "file handling": [
    "file",
    "upload",
    "download",
    "stream",
    "buffer",
    "fs",
    "storage",
  ],
  "real-time": [
    "realtime",
    "websocket",
    "socket",
    "stream",
    "live",
    "push",
    "sse",
  ],
  security: [
    "security",
    "encrypt",
    "decrypt",
    "hash",
    "crypto",
    "vulnerability",
  ],
  caching: ["cache", "redis", "memcached", "memoize"],
  email: ["email", "mail", "smtp", "sendgrid", "mailgun"],
  payment: [
    "payment",
    "stripe",
    "paypal",
    "checkout",
    "billing",
    "subscription",
  ],
};

// Technical patterns
const PATTERNS = {
  "OAuth2 client": ["oauth2", "oauth", "authorization code", "access token"],
  "REST API": ["rest", "restful", "crud", "endpoint"],
  "GraphQL server": ["graphql", "apollo", "resolver", "schema"],
  microservices: ["microservice", "service mesh", "grpc"],
  monorepo: ["monorepo", "workspace", "turborepo", "lerna", "nx"],
  "state management": ["state", "redux", "zustand", "recoil", "mobx", "store"],
  middleware: ["middleware", "interceptor", "hook"],
  "plugin system": ["plugin", "extension", "addon", "module"],
  "rate limiting": ["rate limit", "throttle", "debounce"],
  validation: ["validation", "validator", "schema", "zod", "yup", "joi"],
  logging: ["log", "logger", "winston", "pino", "debug"],
  "event-driven": ["event", "emit", "listener", "pubsub", "queue"],
  serverless: ["serverless", "lambda", "function", "edge"],
  "ssr/ssg": ["ssr", "ssg", "hydration", "static generation"],
};

function analyzeQuery(query) {
  if (!query) return null;

  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);

  // Detect language
  let detectedLanguage = null;
  for (const lang of LANGUAGES) {
    if (lowerQuery.includes(lang.toLowerCase())) {
      detectedLanguage = lang.charAt(0).toUpperCase() + lang.slice(1);
      // Handle special cases
      if (lang === "c++") detectedLanguage = "C++";
      if (lang === "c#" || lang === "csharp") detectedLanguage = "C#";
      if (lang === "f#") detectedLanguage = "F#";
      if (lang === "nextjs" || lang === "next.js") detectedLanguage = "Next.js";
      if (lang === "nodejs" || lang === "node") detectedLanguage = "Node.js";
      break;
    }
  }

  // Detect use case
  let detectedUseCase = null;
  let maxUseCaseMatches = 0;
  for (const [useCase, keywords] of Object.entries(USE_CASES)) {
    const matches = keywords.filter((kw) => lowerQuery.includes(kw)).length;
    if (matches > maxUseCaseMatches) {
      maxUseCaseMatches = matches;
      detectedUseCase = useCase.charAt(0).toUpperCase() + useCase.slice(1);
    }
  }

  // Detect pattern
  let detectedPattern = null;
  for (const [pattern, keywords] of Object.entries(PATTERNS)) {
    if (keywords.some((kw) => lowerQuery.includes(kw))) {
      detectedPattern = pattern;
      break;
    }
  }

  // Only return if we detected something meaningful
  if (!detectedLanguage && !detectedUseCase && !detectedPattern) {
    return null;
  }

  return {
    language: detectedLanguage,
    useCase: detectedUseCase,
    pattern: detectedPattern,
  };
}

export function QueryUnderstandingPanel({ query, className = "" }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const analysis = useMemo(() => analyzeQuery(query), [query]);

  // Don't render if no meaningful analysis
  if (!analysis) return null;

  const hasContent = analysis.language || analysis.useCase || analysis.pattern;
  if (!hasContent) return null;

  return (
    <div className={`mb-4 ${className}`}>
      <div className="glass-premium rounded-xl border border-white/10 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-muted-foreground">
              We understood your query as:
            </span>
          </div>
          <div className="h-6 w-6 flex items-center justify-center">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Content */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-1">
            <div className="flex flex-wrap gap-3">
              {analysis.language && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Code className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-xs text-muted-foreground">
                    Language:
                  </span>
                  <span className="text-sm font-medium text-blue-400">
                    {analysis.language}
                  </span>
                </div>
              )}

              {analysis.useCase && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Lightbulb className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs text-muted-foreground">
                    Use case:
                  </span>
                  <span className="text-sm font-medium text-emerald-400">
                    {analysis.useCase}
                  </span>
                </div>
              )}

              {analysis.pattern && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Layers className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-xs text-muted-foreground">
                    Pattern:
                  </span>
                  <span className="text-sm font-medium text-purple-400">
                    {analysis.pattern}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
