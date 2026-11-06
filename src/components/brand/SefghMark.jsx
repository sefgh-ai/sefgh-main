"use client";

import { useId } from "react";

// SEFGH's marks (BRAND-001, 2026-10-15). The glyph is a star-nosed mole's
// nose: seven rays round a centre, which also reads as "*", the glob every
// developer types. Seven keeps it from collapsing into an X. Scout, the
// mascot, is the same nose on a mole built from one shape: a low back that
// tapers into the snout, resting on a ground line.
//
// Colours come from the brand palette: the nose is the secondary emerald,
// set per theme by --brand-nose-from and --brand-nose-to in globals.css;
// Scout's body is the primary blue. The ray coordinates are written out so
// the server and every browser draw exactly the same numbers. Static copies
// for use outside the site are in public/brand.

// [x1, y1, x2, y2] for each ray, in a 64-unit box.
const RAYS = {
  // Floating rays round a dot: 32 pixels and up.
  glyph: [[32, 21, 32, 6], [40.6, 25.14, 52.33, 15.79], [42.72, 34.45, 57.35, 37.79], [36.77, 41.91, 43.28, 55.43], [27.23, 41.91, 20.72, 55.43], [21.28, 34.45, 6.65, 37.79], [23.4, 25.14, 11.67, 15.79]],
  // Heavier rays and a smaller gap, so the burst survives at 16 and 24.
  glyphSmall: [[32, 22.5, 32, 5.5], [39.43, 26.08, 52.72, 15.48], [41.26, 34.11, 57.84, 37.9], [36.12, 40.56, 43.5, 55.88], [27.88, 40.56, 20.5, 55.88], [22.74, 34.11, 6.16, 37.9], [24.57, 26.08, 11.28, 15.48]],
  tile: [[32, 23, 32, 11], [39.04, 26.39, 48.42, 18.91], [40.77, 34, 52.47, 36.67], [35.9, 40.11, 41.11, 50.92], [28.1, 40.11, 22.89, 50.92], [23.23, 34, 11.53, 36.67], [24.96, 26.39, 15.58, 18.91]],
  tileSmall: [[32, 24, 32, 9], [38.25, 27.01, 49.98, 17.66], [39.8, 33.78, 54.42, 37.12], [35.47, 39.21, 41.98, 52.72], [28.53, 39.21, 22.02, 52.72], [24.2, 33.78, 9.58, 37.12], [25.75, 27.01, 14.02, 17.66]],
  nose: [[54.2, 40, 54.2, 36.7], [56.08, 40.9, 58.66, 38.85], [56.54, 42.93, 59.76, 43.67], [55.24, 44.56, 56.67, 47.54], [53.16, 44.56, 51.73, 47.54], [51.86, 42.93, 48.64, 43.67], [52.32, 40.9, 49.74, 38.85]],
};

const SCOUT_BODY =
  "M6 47C6 37.2 13.4 30.6 23.4 30.6C31.4 30.6 37.6 33.4 43.2 36.8L50.4 41.1C51.7 41.9 51.5 43.6 50 43.9L42.4 45.5C40.6 45.9 39.4 46.4 38.6 47Z";

// useId's value contains characters that are awkward inside url(#...).
function useGradientId(name) {
  return `${name}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function Rays({ rays, width, stroke }) {
  return (
    <g stroke={stroke} strokeWidth={width} strokeLinecap="round">
      {rays.map(([x1, y1, x2, y2]) => (
        <line key={`${x2},${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}
    </g>
  );
}

// Accessible name when a title is given; hidden from screen readers when the
// mark sits next to text that already says "sefgh".
function labelProps(title) {
  return title ? { role: "img", "aria-label": title } : { "aria-hidden": true, focusable: "false" };
}

// The gradient spans the whole drawing (userSpaceOnUse). Sized to each
// element instead, it would skip the ray that points straight up: a vertical
// line has a zero-width box, and SVG paints no gradient on it.
function NoseGradient({ id, from = [0, 0], to = [22.4, 64] }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]}>
      <stop offset="0" style={{ stopColor: "var(--brand-nose-from)" }} />
      <stop offset="1" style={{ stopColor: "var(--brand-nose-to)" }} />
    </linearGradient>
  );
}

/** The glyph on its own, in the theme's emerald. */
export function SefghGlyph({ size = 24, className, title }) {
  const id = useGradientId("sefgh-glyph");
  const small = size <= 24;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...labelProps(title)}>
      <defs>
        <NoseGradient id={id} />
      </defs>
      <Rays rays={small ? RAYS.glyphSmall : RAYS.glyph} width={small ? 8.6 : 6.4} stroke={`url(#${id})`} />
      <circle cx="32" cy="32" r={small ? 7 : 6} fill={`url(#${id})`} />
    </svg>
  );
}

/** The app-icon form: the glyph on a dark tile, the same in both themes. */
export function SefghTile({ size = 36, className, title }) {
  const tile = useGradientId("sefgh-tile");
  const nose = useGradientId("sefgh-tile-nose");
  const small = size <= 32;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...labelProps(title)}>
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1E293B" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
        <linearGradient id={nose} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="22.4" y2="64">
          <stop offset="0" stopColor="#34D399" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${tile})`} />
      <Rays rays={small ? RAYS.tileSmall : RAYS.tile} width={small ? 7.6 : 5.4} stroke={`url(#${nose})`} />
      <circle cx="32" cy="32" r={small ? 6.4 : 5} fill={`url(#${nose})`} />
    </svg>
  );
}

/** The glyph with the wordmark: lowercase, monospace, like something typed. */
export function SefghLogo({ size = 28, className = "", title = "sefgh" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} role="img" aria-label={title}>
      <SefghGlyph size={size} />
      <span
        aria-hidden="true"
        className="font-mono font-bold tracking-[-0.03em] text-foreground leading-none"
        style={{ fontSize: Math.round(size * 0.86) }}
      >
        sefgh
      </span>
    </span>
  );
}

/**
 * Scout, the mascot: for 32 pixels wide and up. The ground follows the text colour.
 * `body` overrides the body gradient as [top, bottom] (the landing page uses
 * GitHub purple); the nose always stays the brand emerald.
 */
export function Scout({
  width = 160,
  className,
  title = "Scout, the SEFGH mole",
  body: bodyColors = ["#3B82F6", "#1D4ED8"],
}) {
  const body = useGradientId("scout-body");
  const nose = useGradientId("scout-nose");
  return (
    <svg
      width={width}
      height={Math.round((width * 29) / 62)}
      viewBox="2 24 62 29"
      fill="none"
      className={className}
      {...labelProps(title)}
    >
      <defs>
        <linearGradient id={body} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={bodyColors[0]} />
          <stop offset="1" stopColor={bodyColors[1]} />
        </linearGradient>
        <NoseGradient id={nose} from={[48.6, 36.7]} to={[52.4, 47.6]} />
      </defs>
      <line x1="4" y1="47" x2="60" y2="47" stroke="currentColor" strokeOpacity=".28" strokeWidth="2" strokeLinecap="round" />
      <path d={SCOUT_BODY} fill={`url(#${body})`} />
      <path d="M29.6 36.2q1.9 -1.5 3.8 0" stroke="#0F172A" strokeWidth="1.7" strokeLinecap="round" />
      <Rays rays={RAYS.nose} width={1.9} stroke={`url(#${nose})`} />
      <circle cx="54.2" cy="42.4" r="1.5" fill={`url(#${nose})`} />
    </svg>
  );
}
