const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, 'assets');
const logoPath = path.join(assetsDir, 'logo.png');

async function main() {
  console.log('🎨 Creating icons from logo.png...\n');

  // Check if logo exists
  if (!fs.existsSync(logoPath)) {
    console.error('❌ logo.png not found in assets folder!');
    process.exit(1);
  }

  // Create icon.png (1024x1024)
  await sharp(logoPath)
    .resize(1024, 1024, { fit: 'contain', background: { r: 13, g: 27, b: 42, alpha: 1 } })
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('✅ Created icon.png (1024x1024)');

  // Create adaptive-icon.png (1024x1024)
  await sharp(logoPath)
    .resize(1024, 1024, { fit: 'contain', background: { r: 13, g: 27, b: 42, alpha: 1 } })
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('✅ Created adaptive-icon.png (1024x1024)');

  // Create favicon.png (48x48)
  await sharp(logoPath)
    .resize(48, 48, { fit: 'contain', background: { r: 13, g: 27, b: 42, alpha: 1 } })
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));
  console.log('✅ Created favicon.png (48x48)');

  // Create splash.png (1284x2778) with logo centered
  const splashWidth = 1284;
  const splashHeight = 2778;
  const logoSize = 400; // Logo size on splash

  // Create background gradient
  const background = await sharp({
    create: {
      width: splashWidth,
      height: splashHeight,
      channels: 4,
      background: { r: 13, g: 27, b: 42, alpha: 1 } // #0D1B2A
    }
  }).png().toBuffer();

  // Resize logo for splash
  const resizedLogo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Composite logo on background
  await sharp(background)
    .composite([{
      input: resizedLogo,
      top: Math.floor((splashHeight - logoSize) / 2) - 100,
      left: Math.floor((splashWidth - logoSize) / 2)
    }])
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
  console.log('✅ Created splash.png (1284x2778)');

  console.log('\n✨ All icons created from logo.png!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
