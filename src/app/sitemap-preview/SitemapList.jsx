"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

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
      <div className="flex items-center gap-3 text-slate-300">
        <Loader2 aria-hidden="true" className="w-5 h-5 animate-spin text-blue-300" />
        Loading sitemap…
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 text-amber-200 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl"
      >
        <AlertTriangle aria-hidden="true" className="w-5 h-5 mt-0.5" />
        <div className="space-y-2">
          <div className="font-semibold">Could not load sitemap</div>
          <p className="text-sm text-amber-100/80">{error}</p>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/30 hover:border-amber-400/50 text-amber-100"
          >
            <RefreshCw aria-hidden="true" className="w-4 h-4" /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>
          Found <span className="font-semibold text-white">{urls.length}</span> entries
          {domain ? ` for ${domain}` : ""}.
        </span>
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-200"
        >
          <RefreshCw aria-hidden="true" className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/40">
        {urls.map((url) => (
          <div key={url} className="px-4 py-3 text-sm text-slate-200 flex items-start gap-3">
            <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400" />
            <a href={url} className="hover:text-blue-200 break-all" target="_blank" rel="noreferrer">
              {url}
            </a>
          </div>
        ))}
        {!urls.length && (
          <div className="px-4 py-6 text-center text-slate-400">No entries found in sitemap.</div>
        )}
      </div>
    </div>
  );
}
