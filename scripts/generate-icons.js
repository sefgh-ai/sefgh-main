/**
 * App icon generator (BRAND-001)
 * Run with: node scripts/generate-icons.js
 *
 * Draws every app icon from the SVG files in public, so the icons always
 * match the logo:
 *
 * - public/icons/icon-<size>.png, the rounded tile, from public/brand/sefgh-icon.svg
 * - public/icons/icon-maskable-*.png and apple-touch-icon.png, the square tile,
 *   from public/brand/sefgh-icon-square.svg (Android and iOS round it themselves)
 * - src/app/favicon.ico with 16, 32 and 48 pixel images. The two small ones
 *   come from public/icon.svg, whose heavier rays stay legible at that size.
 *
 * The SVGs come from the same geometry as src/components/brand/SefghMark.jsx.
 * Change the geometry there and in the SVGs together, then run this script.
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const iconsDir = path.join(root, "public", "icons");
const tile = path.join(root, "public", "brand", "sefgh-icon.svg");
const square = path.join(root, "public", "brand", "sefgh-icon-square.svg");
const small = path.join(root, "public", "icon.svg");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const maskableSizes = [192, 512];

// The SVGs are drawn on a 64-unit square. A high density renders them sharp
// before they are scaled down to each size.
const render = (file, size) =>
  sharp(file, { density: Math.max(72, Math.ceil((72 * size) / 64) * 2) })
    .resize(size, size)
    .png()
    .toBuffer();

// An .ico file is a small header and directory followed by the PNG images.
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
}

async function generateIcons() {
  fs.mkdirSync(iconsDir, { recursive: true });

  for (const size of sizes) {
    fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), await render(tile, size));
    console.log(`Created icon-${size}x${size}.png`);
  }
  for (const size of maskableSizes) {
    fs.writeFileSync(path.join(iconsDir, `icon-maskable-${size}x${size}.png`), await render(square, size));
    console.log(`Created icon-maskable-${size}x${size}.png`);
  }
  fs.writeFileSync(path.join(iconsDir, "apple-touch-icon.png"), await render(square, 180));
  console.log("Created apple-touch-icon.png");

  const favicon = ico([
    { size: 16, png: await render(small, 16) },
    { size: 32, png: await render(small, 32) },
    { size: 48, png: await render(tile, 48) },
  ]);
  fs.writeFileSync(path.join(root, "src", "app", "favicon.ico"), favicon);
  console.log("Created src/app/favicon.ico (16, 32, 48)");
}

generateIcons().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
