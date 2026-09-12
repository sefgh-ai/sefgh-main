"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Check, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const proFeatures = [
  "Unlimited searches",
  "AI code assistant (500 messages/mo)",
  "Search history (unlimited)",
  "API access (10K requests/mo)",
  "Priority email support",
  "Export search results",
];

export function UpgradeDialog({ open, onOpenChange }) {
  const [isAnnual, setIsAnnual] = useState(false);

  const monthlyPrice = 19;
  const annualPrice = 15;
  const currentPrice = isAnnual ? annualPrice : monthlyPrice;
  const savings = Math.round(
    ((monthlyPrice - annualPrice) / monthlyPrice) * 100
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-6 border-b border-border">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Upgrade to Pro
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Unlock the full power of SEFGH
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-muted/50">
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                !isAnnual ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Monthly
            </span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-amber-500"
            />
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                isAnnual ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Annual
            </span>
            {isAnnual && (
              <span className="text-xs font-semibold text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                Save {savings}%
              </span>
            )}
          </div>

          {/* Price */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold">${currentPrice}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            {isAnnual && (
              <p className="text-sm text-muted-foreground mt-1">
                Billed annually (${annualPrice * 12}/year)
              </p>
            )}
          </div>

          {/* Features */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Everything in Free, plus:
            </p>
            <ul className="space-y-2">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button
              className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg"
              onClick={() => {
                // TODO: Integrate with payment system
                window.location.href = `/signup?plan=pro&billing=${
                  isAnnual ? "annual" : "monthly"
                }`;
              }}
            >
              Start Free Trial
            </Button>

            <Link
              href="/pricing"
              className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onOpenChange(false)}
            >
              <span>Compare all plans</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
