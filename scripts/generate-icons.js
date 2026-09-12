/**
 * PWA Icon Generator Script
 * Run with: node scripts/generate-icons.js
 *
 * Generates PNG icons from logo.jpg for PWA installation.
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const logoPath = path.join(__dirname, "..", "public", "logo.jpg");
const iconsDir = path.join(__dirname, "..", "public", "icons");

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const maskableSizes = [192, 512];

// Safe zone for maskable icons - content should be within inner 80% (10% padding on each side)
// This ensures the icon looks good when Android applies circular/rounded masks
const MASKABLE_SAFE_ZONE_PERCENT = 0.8;

async function generateIcons() {
  console.log("Generating PWA icons from logo.jpg...\n");

  // Generate regular icons (with some rounding for app-like appearance)
  for (const size of sizes) {
    const filename = `icon-${size}x${size}.png`;
    await sharp(logoPath)
      .resize(size, size, { fit: "cover", position: "center" })
      .png()
      .toFile(path.join(iconsDir, filename));
    console.log(`✓ Created ${filename}`);
  }

  // Generate maskable icons with proper safe zone padding
  // The logo is placed in the center with padding, on a solid background
  for (const size of maskableSizes) {
    const filename = `icon-maskable-${size}x${size}.png`;
    const innerSize = Math.floor(size * MASKABLE_SAFE_ZONE_PERCENT);
    const padding = Math.floor((size - innerSize) / 2);

    // First resize the logo to fit within the safe zone
    const resizedLogo = await sharp(logoPath)
      .resize(innerSize, innerSize, { fit: "cover", position: "center" })
      .toBuffer();

    // Create canvas with background color and composite the logo in the center
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 10, g: 10, b: 11, alpha: 1 }, // #0a0a0b - matches background_color
      },
    })
      .composite([
        {
          input: resizedLogo,
          left: padding,
          top: padding,
        },
      ])
      .png()
      .toFile(path.join(iconsDir, filename));
    console.log(`✓ Created ${filename} (with safe zone padding)`);
  }

  console.log("\n✅ All PWA icons generated successfully!");
  console.log("📱 Your app should now be installable as a PWA.");
  console.log("\n💡 TIP: Run this script after updating your logo.");
}

generateIcons().catch(console.error);
