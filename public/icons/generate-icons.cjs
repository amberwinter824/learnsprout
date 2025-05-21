// Node.js script to generate favicon and PWA icons from SVG
// Requires: npm install sharp

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'Learn Sprout Logo (1200 x 630 px) (Logo).svg');
const outputDir = __dirname;

const sizes = [
  16, 32, 48, // favicon
  72, 96, 128, 144, 152, 180, 192, 384, 512 // PWA
];

async function generateIcons() {
  for (const size of sizes) {
    const pngPath = path.join(outputDir, `icon-${size}x${size}.png`);
    // Create a white square background
    const background = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .png()
      .toBuffer();

    // Render the SVG resized to fit within the square
    const svgBuffer = await sharp(svgPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer();

    // Composite the resized SVG onto the white background
    await sharp(background)
      .composite([
        {
          input: svgBuffer,
          gravity: 'center',
          blend: 'over',
        }
      ])
      .png()
      .toFile(pngPath);
    console.log(`Generated ${pngPath}`);
  }

  // Special cases for favicons
  // 16x16 and 32x32 are already generated above
  // Generate favicon.ico (contains 16x16, 32x32, 48x48)
  const icoPath = path.join(outputDir, '../favicon.ico');
  await sharp([
    path.join(outputDir, 'icon-16x16.png'),
    path.join(outputDir, 'icon-32x32.png'),
    path.join(outputDir, 'icon-48x48.png')
  ])
    .toFile(icoPath);
  console.log(`Generated ${icoPath}`);

  // Apple touch icon (180x180)
  const applePath = path.join(outputDir, 'apple-touch-icon.png');
  await sharp(path.join(outputDir, 'icon-180x180.png'))
    .toFile(applePath);
  console.log(`Generated ${applePath}`);
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
}); 