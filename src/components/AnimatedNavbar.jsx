"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  MagnifyingGlassIcon,
  ChatCircleIcon,
  CodeSimpleIcon,
  BookOpenIcon,
  InfoIcon,
  TrendUpIcon,
  StackIcon,
  UploadSimpleIcon,
  PulseIcon,
  DownloadSimpleIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";

const ListItem = React.forwardRef(
  ({ className, title, children, icon: Icon, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <a
            ref={ref}
            className={cn(
              "block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50 hover:text-foreground focus:bg-muted/50 focus:text-white",
              className
            )}
            {...props}
          >
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 text-primary" />}
              <div className="text-sm font-medium leading-none text-foreground">
                {title}
              </div>
            </div>
            {children && (
              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1.5 ml-6">
                {children}
              </p>
            )}
          </a>
        </NavigationMenuLink>
      </li>
    );
  }
);
ListItem.displayName = "ListItem";

const ProductCard = ({ title, description, href, src }) => {
  return (
    <Link
      href={href}
      className="flex space-x-3 group p-2 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <Image
        src={src}
        width={120}
        height={60}
        alt={title}
        className="flex-shrink-0 rounded-lg object-cover"
      />
      <div>
        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h4>
        <p className="text-muted-foreground text-xs mt-1 max-w-[140px]">
          {description}
        </p>
      </div>
    </Link>
  );
};

export function AnimatedNavbar({ className }) {
  const { user } = useAuth();

  return (
    <div className={cn("w-auto", className)}>
      <NavigationMenu className="z-50">
        <NavigationMenuList className="rounded-lg border border-border bg-card/80 backdrop-blur-lg px-2 py-1">
          {/* Platform */}
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-transparent text-foreground/90 hover:text-foreground hover:bg-muted/50 data-[state=open]:bg-muted/50">
              Platform
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[220px] gap-1 p-2 bg-card/95 backdrop-blur-xl border border-border rounded-lg">
                <ListItem
                  href="/search"
                  title="Repository Search"
                  icon={MagnifyingGlassIcon}
                />
                <ListItem
                  href="/chat"
                  title="AI Code Assistant"
                  icon={ChatCircleIcon}
                />
                <ListItem
                  href="/playground"
                  title="API Playground"
                  icon={CodeSimpleIcon}
                />
                <ListItem
                  href="/trending"
                  title="Trending Projects"
                  icon={TrendUpIcon}
                />
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Solutions */}
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-transparent text-foreground/90 hover:text-foreground hover:bg-muted/50 data-[state=open]:bg-muted/50">
              Solutions
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="grid grid-cols-2 gap-2 p-3 w-[520px] bg-card/95 backdrop-blur-xl border border-border rounded-lg">
                <ProductCard
                  title="For Developers"
                  href="/search"
                  src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=200&fit=crop"
                  description="Discover code examples and best practices"
                />
                <ProductCard
                  title="For Teams"
                  href="/chat"
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=200&fit=crop"
                  description="Collaborate and share repositories seamlessly"
                />
                <ProductCard
                  title="For Startups"
                  href="/submissions"
                  src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=200&fit=crop"
                  description="Launch your project to the community"
                />
                <ProductCard
                  title="For Enterprises"
                  href="/playground"
                  src="https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=200&fit=crop"
                  description="Scale your development workflow efficiently"
                />
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Open Source */}
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-transparent text-foreground/90 hover:text-foreground hover:bg-muted/50 data-[state=open]:bg-muted/50">
              Open Source
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[220px] gap-1 p-2 bg-card/95 backdrop-blur-xl border border-border rounded-lg">
                <ListItem
                  href="/trending"
                  title="Trending Projects"
                  icon={TrendUpIcon}
                />
                <ListItem
                  href="/submissions"
                  title="Submit Your Project"
                  icon={UploadSimpleIcon}
                />
                <ListItem
                  href="/search"
                  title="Explore Repositories"
                  icon={StackIcon}
                />
                <ListItem href="/about" title="Documentation" icon={BookOpenIcon} />
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Features */}
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-transparent text-foreground/90 hover:text-foreground hover:bg-muted/50 data-[state=open]:bg-muted/50">
              Features
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[220px] gap-1 p-2 bg-card/95 backdrop-blur-xl border border-border rounded-lg">
                <ListItem href="/search" title="GitHub Search" icon={MagnifyingGlassIcon} />
                <ListItem
                  href="/chat"
                  title="AI Chat Assistant"
                  icon={ChatCircleIcon}
                />
                <ListItem
                  href="/playground"
                  title="API Playground"
                  icon={CodeSimpleIcon}
                />
                <ListItem
                  href="/trending"
                  title="Trending Repos"
                  icon={TrendUpIcon}
                />
                <ListItem href="/download" title="Downloads" icon={DownloadSimpleIcon} />
                <ListItem href="/status" title="Status" icon={PulseIcon} />
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Resources */}
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-transparent text-foreground/90 hover:text-foreground hover:bg-muted/50 data-[state=open]:bg-muted/50">
              Resources
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="grid grid-cols-2 gap-2 p-3 w-[520px] bg-card/95 backdrop-blur-xl border border-border rounded-lg">
                <ProductCard
                  title="AI-Powered Search"
                  href="/search"
                  src="https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=200&fit=crop"
                  description="Find GitHub repositories with intelligent semantic search"
                />
                <ProductCard
                  title="Code Assistant"
                  href="/chat"
                  src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=200&fit=crop"
                  description="Get instant help with your code through AI chat"
                />
                <ProductCard
                  title="API Playground"
                  href="/playground"
                  src="https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400&h=200&fit=crop"
                  description="Test and explore GitHub API endpoints interactively"
                />
                <ProductCard
                  title="Trending Today"
                  href="/trending"
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop"
                  description="Discover the hottest repositories on GitHub"
                />
                <ProductCard
                  title="Release Notes"
                  href="/news"
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop"
                  description="Catch up on SEFGH launches and fixes"
                />
                <ProductCard
                  title="Research"
                  href="/research"
                  src="https://images.unsplash.com/photo-1508387024700-9fe5c0b37f1c?w=400&h=200&fit=crop"
                  description="Explore frontier updates and links"
                />
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Community */}
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-transparent text-foreground/90 hover:text-foreground hover:bg-muted/50 data-[state=open]:bg-muted/50">
              Community
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[220px] gap-1 p-2 bg-card/95 backdrop-blur-xl border border-border rounded-lg">
                <ListItem
                  href="/submissions"
                  title="Submit Your Project"
                  icon={UploadSimpleIcon}
                />
                <ListItem href="/about" title="About SEFGH" icon={InfoIcon} />
                {!user && (
                  <ListItem
                    href="/signup"
                    title="Join Community"
                    icon={UserPlusIcon}
                  />
                )}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
