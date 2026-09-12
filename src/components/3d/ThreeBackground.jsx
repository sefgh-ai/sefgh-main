"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useState, useEffect, memo } from "react";
import ParticleField from "./ParticleField";

// Memoized to prevent unnecessary re-renders
const ThreeBackground = memo(function ThreeBackground() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <Canvas
        camera={{ position: [0, 2, 15], fov: 75 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ParticleField />
        </Suspense>
      </Canvas>

      {/* Sci-fi gradient overlays and scan lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glowing orbs */}
        <div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/12 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "3s" }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "4s", animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-teal-600/8 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "5s", animationDelay: "2s" }}
        />
        <div
          className="absolute top-2/3 left-1/3 w-[350px] h-[350px] bg-emerald-700/6 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "6s", animationDelay: "3s" }}
        />

        {/* Scan lines effect */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, #3b82f6 2px, #3b82f6 4px)",
          }}
        />

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-blue-500/20" />
        <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-blue-500/20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-blue-500/20" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-blue-500/20" />

        {/* Animated data flow lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1="40%"
            x2="100%"
            y2="40%"
            stroke="url(#lineGradient)"
            strokeWidth="1.5"
          >
            <animate
              attributeName="x1"
              from="-100%"
              to="200%"
              dur="10s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="x2"
              from="0%"
              to="300%"
              dur="10s"
              repeatCount="indefinite"
            />
          </line>
        </svg>
      </div>
    </div>
  );
});

export default ThreeBackground;
