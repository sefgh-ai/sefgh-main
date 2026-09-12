"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { PageLoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SearchNavbar } from "@/components/search/SearchNavbar";
import { SearchSidebar } from "@/components/search/SearchSidebar";
import { MobileBottomNav } from "@/components/search/MobileBottomNav";
import Footer from "@/components/Footer";
import PlaygroundHeader from "@/components/playground/PlaygroundHeader";
import { playgroundTabs } from "@/lib/utils/playground/tabConfig";
import { Button } from "@/components/ui/button";

export default function PlaygroundPage() {
  const { user } = useAuth() || {};
  const { isAuthenticated, isLoading } = useAuthGuard();
  const [activeTab, setActiveTab] = useState("keys");

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  if (!user || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
        <div className="max-w-4xl mx-auto flex-1 w-full px-4 sm:px-6 lg:px-8 py-16 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200 text-sm font-medium">
            Playground Preview
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Explore the Playground
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Sign in to access interactive experiments, API key management, and advanced search tools tailored for SEFGH users.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/login">Sign in to continue</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/pricing">View plans</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left mt-8">
            {["Run queries with saved prompts", "Manage personal API keys", "Try beta features early"].map((item) => (
              <div
                key={item}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-full w-full bg-background gradient-mesh flex-col overflow-hidden">
        {/* Main content area with sidebar */}
        <div className="flex flex-1 min-h-0 p-1 sm:p-4 gap-1 sm:gap-4 pb-[72px] md:pb-2">
          <SearchSidebar user={user} />

          <SidebarInset className="flex flex-col glass-premium rounded-lg sm:rounded-2xl shadow-premium border border-white/10 overflow-hidden flex-1 min-h-0">
            <SearchNavbar showFilters={false} />

            <div className="w-full px-2 sm:px-6 lg:px-8 py-2 sm:py-6 pb-4 overflow-y-auto flex-1 min-h-0">
              <div className="container mx-auto max-w-7xl">
                <PlaygroundHeader />

                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="space-y-6"
                >
                  <TabsList className="grid w-full grid-cols-5 lg:w-auto">
                    {playgroundTabs.map(({ value, label, icon: Icon }) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className="flex items-center gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {playgroundTabs.map(({ value, component: Component }) => (
                    <TabsContent
                      key={value}
                      value={value}
                      className="space-y-4"
                    >
                      <Component userId={user.id} />
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </div>
          </SidebarInset>
        </div>

        {/* Footer - hidden on mobile to make room for bottom nav */}
        <div className="hidden md:block">
          <Footer />
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav user={user} />
      </div>
    </SidebarProvider>
  );
}
