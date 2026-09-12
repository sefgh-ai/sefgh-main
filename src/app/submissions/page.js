"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useSubmissions } from "@/hooks/submissions/useSubmissions";
import SubmissionCard from "@/components/submissions/SubmissionCard";
import SubmissionsEmptyState from "@/components/submissions/SubmissionsEmptyState";
import SubmissionsLoadingSkeleton from "@/components/submissions/SubmissionsLoadingSkeleton";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SearchNavbar } from "@/components/search/SearchNavbar";
import { SearchSidebar } from "@/components/search/SearchSidebar";
import { MobileBottomNav } from "@/components/search/MobileBottomNav";
import Footer from "@/components/Footer";

export default function SubmissionsPage() {
  const { user } = useAuth();
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();
  const { submissions, loading, handleDelete } = useSubmissions(user);

  const isLoading = authLoading || loading;

  if (!isAuthenticated && !authLoading) {
    return null;
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
              <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="mb-6 sm:mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                    Your Submissions
                  </h1>
                  {!isLoading && submissions.length > 0 && (
                    <p className="text-muted-foreground">
                      Manage your submitted repositories ({submissions.length})
                    </p>
                  )}
                </div>

                {/* Content */}
                {isLoading ? (
                  <SubmissionsLoadingSkeleton />
                ) : submissions.length === 0 ? (
                  <SubmissionsEmptyState />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {submissions.map((submission) => (
                      <SubmissionCard
                        key={submission.id}
                        submission={submission}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
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
