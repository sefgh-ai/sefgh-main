"use client";

import React from "react";
import DownloadHeader from "@/components/downloads/DownloadHeader";
import PlatformCard from "@/components/downloads/PlatformCard";
import DownloadFooter from "@/components/downloads/DownloadFooter";
import { platformData } from "@/lib/utils/download/platformData";

export default function DownloadsPage() {
  const desktopPlatforms = ["macOS", "Windows", "Linux"];
  const mobilePlatforms = ["iOS", "Android"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/20 py-10 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <DownloadHeader />

        {/* Desktop Download Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10 md:gap-14 max-w-7xl mx-auto mb-8 sm:mb-14">
          {desktopPlatforms.map((platform) => {
            const data = platformData[platform];
            return (
              <PlatformCard
                key={platform}
                name={data.name}
                icon={data.icon}
                gradient={data.gradient}
                hoverGradient={data.hoverGradient}
                iconBg={data.iconBg}
                downloads={data.downloads}
              />
            );
          })}
        </div>

        {/* Mobile Download Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-14 max-w-4xl mx-auto">
          {mobilePlatforms.map((platform) => {
            const data = platformData[platform];
            return (
              <PlatformCard
                key={platform}
                name={data.name}
                icon={data.icon}
                gradient={data.gradient}
                hoverGradient={data.hoverGradient}
                iconBg={data.iconBg}
                downloads={data.downloads}
              />
            );
          })}
        </div>

        <DownloadFooter />
      </div>
    </div>
  );
}
