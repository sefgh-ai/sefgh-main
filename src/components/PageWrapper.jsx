"use client";

import { usePathname } from "next/navigation";
import { memo } from "react";
import Footer from "./Footer";

const PageWrapper = memo(function PageWrapper({ children }) {
  const pathname = usePathname();

  // Don't show footer on landing page or 404 page
  const isLandingPage = pathname === "/";
  const is404Page = pathname && !pathname.match(/^\/[a-z-]+$/);

  // Pages with their own sidebar layout handle footer internally
  const hasOwnLayout =
    pathname === "/home" ||
    pathname === "/search" ||
    pathname === "/chat" ||
    pathname === "/trending" ||
    pathname === "/playground" ||
    pathname === "/submissions";

  // Pages that use AppFooter (big main site footer) - don't add small Footer
  const hasAppFooter =
    pathname === "/about" ||
    pathname === "/brand" ||
    pathname === "/careers" ||
    pathname === "/contact" ||
    pathname === "/pricing" ||
    pathname === "/cookie-policy" ||
    pathname === "/terms" ||
    pathname === "/terms-of-use" ||
    pathname === "/privacy" ||
    pathname === "/accessibility" ||
    pathname === "/versions" ||
    pathname === "/feedback" ||
    pathname === "/business" ||
    pathname === "/links";

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        {children}
      </div>
      {!isLandingPage && !hasOwnLayout && !hasAppFooter && <Footer />}
    </div>
  );
});

export default PageWrapper;
