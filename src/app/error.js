"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Keeps the app shell (nav, footer) intact so a
 * single broken page does not blank the whole site.
 */
export default function RouteError({ error, reset }) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          This page didn&apos;t load
        </h1>
        <p className="text-muted-foreground">
          Something went wrong rendering it. Trying again often works.
        </p>
        {error?.message ? (
          <pre className="rounded-md border border-border bg-muted p-3 text-left text-xs text-destructive overflow-x-auto">
            {error.message}
          </pre>
        ) : null}
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </main>
  );
}
