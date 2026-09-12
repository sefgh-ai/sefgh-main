"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export function AboutCard() {
  return (
    <Card className="border-border backdrop-blur-sm">
      <CardContent className="p-4 space-y-2">
        <div className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
          <BookOpen className="w-3.5 h-3.5" />
          About
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          SEFGH is an AI-powered search platform with intelligent query
          understanding, real-time suggestions, and multi-language support.
        </p>
        <div className="flex flex-wrap gap-x-2 gap-y-0 text-xs">
          <Link
            href="/feedback"
            className="text-primary hover:text-primary/80 hover:underline text-xs"
          >
            Feedback
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link
            href="/business"
            className="text-primary hover:text-primary/80 hover:underline text-xs"
          >
            Business
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link
            href="/links"
            className="text-primary hover:text-primary/80 hover:underline text-xs"
          >
            Links
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
