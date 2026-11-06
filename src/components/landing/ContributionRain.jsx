"use client";

import { useEffect, useRef } from "react";

// GitHub-style contribution squares falling like rain behind the landing page
// (above the footer). The canvas is one viewport tall and sticky, so the rain
// keeps falling as the page scrolls; the faint empty grid under it is plain
// CSS in Landing.jsx, so the canvas only draws moving squares.
//
// Performance: every square is a pre-rendered sprite (the head's glow is baked
// in once), so a frame is only clearRect + drawImage calls, with no per-square
// paths or shadow blurs. The floor position is read on scroll/resize, not
// every frame. The loop stops off screen and in hidden tabs.
//
// `floorRef` marks where the rain ends: when its bottom edge is in view, each
// square that reaches it shatters into four pieces that bounce and fade.
// With reduced motion one still frame is drawn (no shattering).

const SIZE = 14;
const GAP = 6;
const PITCH = SIZE + GAP;
const PAD = 8; // room round a sprite for the head's glow
const LEVELS = ["#0e4429", "#006d32", "#26a641", "#39d353"];
const FLOOR_INSET = 28; // shatter this far above the footer, so pieces stay visible
const FADE = 220; // squares dim slightly over this distance above the floor
const GRAVITY = 520;
const MAX_PIECES = 480;

const speed = () => 70 + Math.random() * 60;
const length = () => 4 + Math.floor(Math.random() * 7);

function sprite(color, glow, dpr) {
  const c = document.createElement("canvas");
  const box = SIZE + PAD * 2;
  c.width = Math.ceil(box * dpr);
  c.height = Math.ceil(box * dpr);
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  if (glow) {
    g.shadowColor = "rgba(57, 211, 83, 0.55)";
    g.shadowBlur = 7;
  }
  g.fillStyle = color;
  g.beginPath();
  g.roundRect(PAD, PAD, SIZE, SIZE, 2.5);
  g.fill();
  return c;
}

export default function ContributionRain({ className, floorRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let drops = [];
    let pieces = [];
    let sprites = [];
    let floor = Infinity;
    let frame = 0;
    let last = 0;
    let visible = true;

    const seed = (col, spread) => ({
      col,
      y: Math.random() * spread - spread * 0.3,
      v: speed(),
      len: length(),
      hit: 0, // squares of this drop that have already shattered
    });

    function measureFloor() {
      const el = floorRef?.current;
      if (!el) {
        floor = Infinity;
        return;
      }
      const f = el.getBoundingClientRect().bottom - canvas.getBoundingClientRect().top - FLOOR_INSET;
      floor = f < height + FADE ? f : Infinity;
    }

    function layout() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = r.width;
      height = r.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sprites = LEVELS.map((c, i) => sprite(c, i === 3, dpr));
      const cols = Math.ceil(width / PITCH);
      drops = [];
      for (let c = 0; c < cols; c++) {
        const n = Math.random() < 0.85 ? 2 : 1;
        for (let k = 0; k < n; k++) drops.push(seed(c, height * 1.3));
      }
      pieces = [];
      measureFloor();
    }

    function shatter(x, y, color) {
      if (pieces.length > MAX_PIECES) return;
      const half = SIZE / 2;
      for (let i = 0; i < 4; i++) {
        const dir = i % 2 ? 1 : -1;
        pieces.push({
          x: x + (i % 2) * half,
          y: y + (i > 1 ? half : 0),
          vx: dir * (25 + Math.random() * 70),
          vy: -(60 + Math.random() * 110),
          life: 0.55 + Math.random() * 0.3,
          age: 0,
          size: half - 1 - Math.random() * 2,
          color,
        });
      }
    }

    function draw(now) {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      ctx.clearRect(0, 0, width, height);
      const bottom = Math.min(floor, height);

      for (const d of drops) {
        if (!reduce) d.y += d.v * dt;
        const x = d.col * PITCH + GAP / 2;

        // Squares that reach the floor shatter, oldest (the head) first.
        if (!reduce && floor !== Infinity) {
          while (d.hit < d.len && d.y - d.hit * PITCH + SIZE >= floor) {
            const level = d.hit === 0 ? 3 : d.hit < 2 ? 2 : d.hit < 4 ? 1 : 0;
            shatter(x, floor - SIZE, LEVELS[level]);
            d.hit++;
          }
        }

        if (d.hit >= d.len || d.y - d.len * PITCH > bottom) {
          Object.assign(d, seed(d.col, 0), { y: -Math.random() * height * 0.35 });
          continue;
        }

        for (let s = d.hit; s < d.len; s++) {
          const y = d.y - s * PITCH;
          if (y < -SIZE || y > bottom) continue;
          let alpha = 1 - (s / d.len) * 0.55;
          if (floor !== Infinity && y > floor - FADE) alpha *= 1 - ((y - (floor - FADE)) / FADE) * 0.45;
          ctx.globalAlpha = alpha;
          const level = s === 0 ? 3 : s < 2 ? 2 : s < 4 ? 1 : 0;
          ctx.drawImage(sprites[level], x - PAD, y - PAD, SIZE + PAD * 2, SIZE + PAD * 2);
        }
      }

      // Shattered pieces: a short hop, gravity, fade.
      if (pieces.length) {
        let n = 0;
        for (const p of pieces) {
          p.age += dt;
          if (p.age >= p.life) continue;
          p.vy += GRAVITY * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          ctx.globalAlpha = 1 - p.age / p.life;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size);
          pieces[n++] = p;
        }
        pieces.length = n;
      }

      ctx.globalAlpha = 1;
      if (!reduce && visible && !document.hidden) frame = requestAnimationFrame(draw);
    }

    function start() {
      cancelAnimationFrame(frame);
      last = 0;
      frame = requestAnimationFrame(draw);
    }

    layout();
    start();

    const resize = new ResizeObserver(() => {
      layout();
      if (reduce) start();
    });
    resize.observe(canvas);
    if (floorRef?.current) resize.observe(floorRef.current);

    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduce) start();
    });
    seen.observe(canvas);

    const onVisibility = () => {
      if (!document.hidden && visible && !reduce) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // The page scrolls inside PageWrapper, so listen in the capture phase.
    const onScroll = () => {
      measureFloor();
      if (reduce) start();
    };
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [floorRef]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
