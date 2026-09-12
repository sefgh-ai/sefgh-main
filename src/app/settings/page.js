"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Bell,
  Shield,
  Monitor,
  Palette,
  Database,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SearchNavbar } from "@/components/search/SearchNavbar";
import { SearchSidebar } from "@/components/search/SearchSidebar";
import { MobileBottomNav } from "@/components/search/MobileBottomNav";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { PageLoadingSpinner } from "@/components/shared/LoadingSpinner";
import AccountTab from "@/components/settings/AccountTab";
import NotificationsTab from "@/components/settings/NotificationsTab";
import SecurityTab from "@/components/settings/SecurityTab";
import SessionsTab from "@/components/settings/SessionsTab";
import PersonalizeTab from "@/components/settings/PersonalizeTab";
import DataControlsTab from "@/components/settings/DataControlsTab";
import FeedbackTab from "@/components/settings/FeedbackTab";

const settingsTabs = [
  {
    id: "account",
    label: "Account",
    icon: User,
    description: "Manage your profile & preferences",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Control how we reach you",
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    description: "Protect your account",
  },
  {
    id: "sessions",
    label: "Sessions",
    icon: Monitor,
    description: "View active sessions",
  },
  {
    id: "personalize",
    label: "Personalize",
    icon: Palette,
    description: "Customize your experience",
  },
  {
    id: "data",
    label: "Data & Privacy",
    icon: Database,
    description: "Manage your data",
  },
  {
    id: "feedback",
    label: "Feedback",
    icon: MessageSquare,
    description: "Help us improve",
  },
];

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { isAuthenticated, isLoading } = useAuthGuard();

  // Get initial tab from URL or default to 'account'
  const tabFromUrl = searchParams.get("tab");
  const initialTab =
    tabFromUrl && settingsTabs.find((t) => t.id === tabFromUrl)
      ? tabFromUrl
      : "account";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update URL when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    router.push(`/settings?tab=${tabId}`, { scroll: false });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        // Already on settings page
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case "account":
        return <AccountTab />;
      case "notifications":
        return <NotificationsTab />;
      case "security":
        return <SecurityTab />;
      case "sessions":
        return <SessionsTab />;
      case "personalize":
        return <PersonalizeTab />;
      case "data":
        return <DataControlsTab />;
      case "feedback":
        return <FeedbackTab />;
      default:
        return <AccountTab />;
    }
  };

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  const currentTab = settingsTabs.find((t) => t.id === activeTab);

  return (
    <SidebarProvider>
      <div className="flex h-full w-full bg-background gradient-mesh flex-col overflow-hidden">
        {/* Main content area with sidebar */}
        <div className="flex flex-1 min-h-0 p-1 sm:p-4 gap-1 sm:gap-4 pb-[72px] md:pb-2">
          <SearchSidebar user={user} />

          <SidebarInset className="flex flex-col glass-premium rounded-lg sm:rounded-2xl shadow-premium border border-white/10 overflow-hidden flex-1 min-h-0">
            <SearchNavbar showFilters={false} />

            <div className="w-full px-2 sm:px-6 lg:px-8 py-2 sm:py-6 pb-4 overflow-y-auto flex-1 min-h-0">
              <div className="max-w-7xl mx-auto">
                {/* Page Title */}
                <div className="mb-6 sm:mb-8">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        Settings
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Manage your SEFGH account and preferences
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                  {/* Sidebar Navigation - Horizontal on mobile, vertical on desktop */}
                  <aside className="w-full lg:w-72 flex-shrink-0">
                    <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 lg:sticky lg:top-4">
                      {settingsTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex-shrink-0 lg:w-full group flex items-center lg:items-start gap-2 lg:gap-4 px-3 lg:px-4 py-2 lg:py-3.5 rounded-xl text-left transition-all duration-200 ${
                              isActive
                                ? "bg-primary/10 border border-primary/20 shadow-sm"
                                : "hover:bg-muted/60 border border-transparent"
                            }`}
                          >
                            <div
                              className={`flex-shrink-0 p-1.5 lg:p-2 rounded-lg transition-colors ${
                                isActive
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted/50 text-muted-foreground group-hover:text-foreground group-hover:bg-muted"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="hidden lg:block flex-1 min-w-0">
                              <span
                                className={`block text-sm font-medium truncate transition-colors ${
                                  isActive ? "text-primary" : "text-foreground"
                                }`}
                              >
                                {tab.label}
                              </span>
                              <span className="block text-xs text-muted-foreground truncate mt-0.5">
                                {tab.description}
                              </span>
                            </div>
                            <span
                              className={`lg:hidden text-xs font-medium whitespace-nowrap ${
                                isActive ? "text-primary" : "text-foreground"
                              }`}
                            >
                              {tab.label}
                            </span>
                          </button>
                        );
                      })}
                    </nav>
                  </aside>

                  {/* Main Content */}
                  <main className="flex-1 min-w-0">
                    <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                      {/* Tab Header */}
                      <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-border/50 bg-muted/20">
                        <div className="flex items-center gap-3">
                          {currentTab && (
                            <>
                              <div className="p-2 rounded-lg bg-primary/10">
                                <currentTab.icon className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h2 className="text-lg sm:text-xl font-semibold">
                                  {currentTab.label}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                  {currentTab.description}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Tab Content */}
                      <div className="px-4 sm:px-8 py-4 sm:py-8">
                        {renderTabContent()}
                      </div>
                    </div>
                  </main>
                </div>
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

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <SettingsPageContent />
    </Suspense>
  );
}
