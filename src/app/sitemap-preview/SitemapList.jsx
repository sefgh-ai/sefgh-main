"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "@/components/ui/icons";

async function fetchSitemapUrls() {
  const res = await fetch("/sitemap.xml");
  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap (status ${res.status})`);
  }
  const text = await res.text();
  const xml = new DOMParser().parseFromString(text, "application/xml");
  if (xml.querySelector("parsererror")) {
    throw new Error("Sitemap is not valid XML");
  }
  return Array.from(xml.getElementsByTagName("loc"))
    .map((node) => node.textContent?.trim())
    .filter(Boolean);
}

export default function SitemapList() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const extracted = await fetchSitemapUrls();
      if (!signal?.aborted) setUrls(extracted);
    } catch (err) {
      if (!signal?.aborted) {
        setUrls([]);
        setError(err.message || "Unable to parse sitemap");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const domain = useMemo(() => {
    if (!urls.length) return "";
    try {
      return new URL(urls[0]).origin;
    } catch {
      return "";
    }
  }, [urls]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 aria-hidden="true" className="w-5 h-5 animate-spin text-primary" />
        Loading sitemap…
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 text-warning bg-warning/10 border border-warning/30 p-4 rounded-xl"
      >
        <AlertTriangle aria-hidden="true" className="w-5 h-5 mt-0.5" />
        <div className="space-y-2">
          <div className="font-semibold">Could not load sitemap</div>
          <p className="text-sm text-warning/80">{error}</p>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-warning/30 hover:border-warning/60 text-warning"
          >
            <RefreshCw aria-hidden="true" className="w-4 h-4" /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Found <span className="font-semibold text-foreground">{urls.length}</span> entries
          {domain ? ` for ${domain}` : ""}.
        </span>
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:border-border text-foreground"
        >
          <RefreshCw aria-hidden="true" className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-background/40">
        {urls.map((url) => (
          <div key={url} className="px-4 py-3 text-sm text-foreground flex items-start gap-3">
            <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
            <a href={url} className="hover:text-primary break-all" target="_blank" rel="noreferrer">
              {url}
            </a>
          </div>
        ))}
        {!urls.length && (
          <div className="px-4 py-6 text-center text-muted-foreground">No entries found in sitemap.</div>
        )}
      </div>
    </div>
  );
}
