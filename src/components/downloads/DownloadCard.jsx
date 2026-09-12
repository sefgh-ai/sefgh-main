"use client";

import { Download } from "lucide-react";
import Image from "next/image";

export default function DownloadCard({
  platform,
  icon,
  gradientFrom,
  gradientVia,
  gradientTo,
  downloads,
}) {
  return (
    <div className="group relative">
      {/* Gradient Border Effect */}
      <div
        className={`absolute -inset-0.5 bg-gradient-to-r ${gradientFrom} ${
          gradientVia || ""
        } ${gradientTo} rounded-[20px] sm:rounded-[28px] opacity-0 group-hover:opacity-100 blur transition-all duration-500`}
      ></div>

      <div className="relative bg-white dark:bg-gray-900 rounded-[20px] sm:rounded-[26px] p-6 sm:p-8 md:p-10 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100 dark:border-gray-800 group-hover:border-transparent">
        {/* Icon */}
        <div className="flex justify-center mb-6 sm:mb-8 md:mb-10">
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-[24px] sm:rounded-[32px] flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${gradientFrom}/10 ${gradientTo}/10 rounded-[24px] sm:rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
            ></div>
            {icon}
          </div>
        </div>

        {/* Platform Name */}
        <h2
          className={`text-2xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-4 sm:mb-6 md:mb-8 group-hover:text-transparent group-hover:bg-gradient-to-r ${gradientFrom} ${gradientTo} group-hover:bg-clip-text transition-all duration-300`}
        >
          {platform}
        </h2>

        {/* Download Buttons */}
        <div className="space-y-3 sm:space-y-4">
          {downloads.map((download, index) => (
            <a
              key={index}
              href={download.url || "#"}
              className={`flex items-center justify-between w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 hover:${gradientFrom} hover:${gradientTo} text-gray-700 dark:text-gray-200 hover:text-white rounded-xl sm:rounded-2xl transition-all duration-300 group/btn shadow-md hover:shadow-xl transform hover:-translate-y-1`}
            >
              <span className="text-xs sm:text-sm font-semibold">
                {download.label}
              </span>
              <Download className="w-4 h-4 sm:w-5 sm:h-5 group-hover/btn:translate-y-1 group-hover/btn:scale-110 transition-all duration-300 flex-shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
