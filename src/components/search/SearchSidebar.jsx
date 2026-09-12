"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Home,
  Search,
  Send,
  ChartNoAxesCombined,
  Star,
  Clock,
  Settings,
  Lock,
  Upload,
  Key,
  Sparkles,
  ChevronRight,
  Zap,
  Telescope,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UpgradeDialog } from "@/components/search/UpgradeDialog";

// Defined at module scope: a component declared inside another component is
// a brand-new type on every render, so React unmounts and remounts it and
// any state inside is lost (react-hooks/static-components).
function NavItem({ href, icon: Icon, label, isActive, badge }) {
  return (
  <SidebarMenuItem>
    <SidebarMenuButton
      asChild
      className={`group relative rounded-xl transition-all duration-200 ${
        isActive
          ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
          : "hover:bg-accent text-muted-foreground hover:text-foreground"
      }`}
    >
      <Link href={href} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
              isActive
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-medium text-sm">{label}</span>
        </div>
        {badge && (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary">
            {badge}
          </span>
        )}
        {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
  );
}

export function SearchSidebar({ user }) {
  const pathname = usePathname();
  const [upgradeOpen, setUpgradeOpen] = useState(false);


  return (
    <Sidebar
      suppressHydrationWarning
      collapsible="offcanvas"
      className="overflow-hidden"
      style={{ "--sidebar-width": "14rem" }}
    >
      {/* Logo Section */}
      <SidebarHeader className="h-16 flex items-center border-b px-5">
        <Link href="/home" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
              <Image
                src="/logo.jpg"
                alt="SEFGH Logo"
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-foreground">SEFGH</span>
            <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">
              AI Search Engine
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* Scrollable content area */}
      <SidebarContent className="gap-0 overflow-y-auto px-3 py-4">
        {/* Main Navigation */}
        <SidebarGroup className="mb-2">
          <SidebarGroupLabel className="px-3 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Discover
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <NavItem
                href="/home"
                icon={Home}
                label="Home"
                isActive={pathname === "/home"}
              />
              <NavItem
                href="/search"
                icon={Search}
                label="Search"
                isActive={pathname === "/search"}
              />
              <NavItem
                href="/chat"
                icon={Send}
                label="AI Chat"
                isActive={pathname === "/chat"}
                badge="AI"
              />
              <NavItem
                href="/trending"
                icon={ChartNoAxesCombined}
                label="Trending"
                isActive={pathname === "/trending"}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user ? (
          <>
            {/* Your Content - includes History, Starred, Playground, Submissions */}
            <SidebarGroup className="mb-2">
              <SidebarGroupLabel className="px-3 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Your Content
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  <NavItem
                    href="/starred"
                    icon={Star}
                    label="Starred"
                    isActive={pathname === "/starred"}
                  />
                  <NavItem
                    href="/history"
                    icon={Clock}
                    label="History"
                    isActive={pathname === "/history"}
                  />
                  <NavItem
                    href="/playground"
                    icon={Key}
                    label="Playground"
                    isActive={pathname === "/playground"}
                  />
                  <NavItem
                    href="/submissions"
                    icon={Upload}
                    label="Submissions"
                    isActive={pathname === "/submissions"}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          /* Get Started for logged out users */
          <SidebarGroup className="mt-4">
            <div className="mx-1 p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Telescope className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">
                  Get Started
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Sign in to access your history, starred repos, and personalized
                features.
              </p>
              <SidebarMenuButton
                asChild
                className="w-full justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
              >
                <Link href="/login" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span className="font-medium">Sign In</span>
                </Link>
              </SidebarMenuButton>
            </div>
          </SidebarGroup>
        )}

        {/* Pro Upgrade Card for logged in users */}
        {user && (
          <div className="mt-auto pt-4">
            <div className="mx-1 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-foreground" />
                </div>
                <span className="font-semibold text-sm text-foreground">
                  Upgrade to Pro
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Unlimited AI searches & more
              </p>
              <button
                onClick={() => setUpgradeOpen(true)}
                className="w-full py-2 px-3 text-xs font-medium rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        )}
      </SidebarContent>

      {/* Upgrade Dialog */}
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </Sidebar>
  );
}
