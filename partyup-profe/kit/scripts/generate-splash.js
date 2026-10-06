/**
 * Generates assets/images/splash-icon.png from assets/images/icon.png
 * with rounded corners for the native splash screen.
 * Run: node scripts/generate-splash.js
 */

const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ICON_PATH = path.join(ROOT, 'assets/images/icon.png');
const OUT_PATH = path.join(ROOT, 'assets/images/splash-icon.png');

const SIZE = 1024; // high res for splash
const RADIUS = 160; // rounded corner radius (px)

const maskSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg"><rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" ry="${RADIUS}" fill="white"/></svg>`
);

sharp(ICON_PATH)
  .resize(SIZE, SIZE)
  .composite([{ input: maskSvg, blend: 'dest-in' }])
  .png()
  .toFile(OUT_PATH)
  .then(() => console.log('Created assets/images/splash-icon.png (rounded corners)'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
