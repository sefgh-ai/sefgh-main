'use client';

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Home,
  ArrowRight,
  Book,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";

const demoLinks = [
  {
    title: "Documentation",
    subtitle: "Dive in to learn all about our project",
    icon: BookOpen,
    href: "/about",
  },
  {
    title: "Our blog",
    subtitle: "Read the latest post on our blog",
    icon: Book,
    href: "/trending",
  },
  {
    title: "Chat to us",
    subtitle: "Can't find what you're looking for?",
    icon: MessageCircle,
    href: "/chat",
  },
];

export default function NotFoundPage() {
  return (
    <main className="h-full w-full flex items-center justify-center py-4 px-4 bg-background">
      <div className="container mx-auto">
        <div className="flex justify-center">
          <div className="w-full sm:w-10/12 md:w-8/12 text-center">
            {/* 404 Hero Section */}
            <div className="relative py-12">
              <h1 className="text-center text-foreground text-8xl sm:text-9xl font-bold">
                404
              </h1>
            </div>

            {/* Content Section */}
            <div className="mt-[-30px]">
              <h3 className="text-xl text-foreground sm:text-2xl font-bold mb-3">
                Look like you&apos;re lost
              </h3>
              <p className="mb-4 text-muted-foreground text-sm sm:text-base">
                The page you are looking for is not available!
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3 flex-col sm:flex-row justify-center items-center my-4">
                <Link href="/" passHref>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go back
                  </Button>
                </Link>
                <Link href="/" passHref>
                  <Button
                    variant="default"
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Go to Home
                  </Button>
                </Link>
              </div>
            </div>

            {/* Helpful Links Section */}
            <div className="mt-6 flex flex-col gap-2 max-w-2xl mx-auto">
              <h4 className="text-base font-semibold text-foreground mb-1">
                Helpful Links
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {demoLinks.map((link) => (
                  <Link
                    href={link.href}
                    key={link.title}
                    className="group relative p-3 border border-border rounded-lg hover:border-green-500 transition-all hover:shadow-lg bg-card"
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                        <link.icon className="size-5" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="text-sm font-semibold text-foreground flex items-center justify-center gap-2">
                          {link.title}
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {link.subtitle}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
