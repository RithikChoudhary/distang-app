const sharp = require('sharp');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');

async function createIcon(size, filename) {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#14B8A6"/>
        <stop offset="100%" style="stop-color:#0D9488"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#grad)" rx="${Math.floor(size * 0.15)}"/>
    <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" 
          font-family="Arial Black, Arial, sans-serif" font-weight="900" 
          font-size="${Math.floor(size * 0.55)}" fill="white">D</text>
  </svg>`;
  
  const outputPath = path.join(assetsDir, filename);
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  const stats = require('fs').statSync(outputPath);
  console.log(`✅ Created ${filename} (${size}x${size}) - ${stats.size} bytes`);
}

async function createSplash() {
  const width = 1284;
  const height = 2778;
  
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0D1B2A"/>
        <stop offset="50%" style="stop-color:#1B3A4B"/>
        <stop offset="100%" style="stop-color:#065A60"/>
      </linearGradient>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#14B8A6"/>
        <stop offset="100%" style="stop-color:#0D9488"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
    <circle cx="${width/2}" cy="${height/2 - 100}" r="120" fill="url(#logoGrad)"/>
    <text x="${width/2}" y="${height/2 - 70}" dominant-baseline="middle" text-anchor="middle" 
          font-family="Arial Black, Arial, sans-serif" font-weight="900" 
          font-size="140" fill="white">D</text>
    <text x="${width/2}" y="${height/2 + 100}" dominant-baseline="middle" text-anchor="middle" 
          font-family="Arial, sans-serif" font-weight="bold" 
          font-size="72" fill="white">Distang</text>
    <text x="${width/2}" y="${height/2 + 180}" dominant-baseline="middle" text-anchor="middle" 
          font-family="Arial, sans-serif" font-size="32" fill="#94A3B8">Stay Connected, Stay Close</text>
  </svg>`;
  
  const outputPath = path.join(assetsDir, 'splash.png');
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  const stats = require('fs').statSync(outputPath);
  console.log(`✅ Created splash.png (${width}x${height}) - ${stats.size} bytes`);
}

async function main() {
  console.log('🎨 Generating Distang app icons...\n');
  
  await createIcon(1024, 'icon.png');
  await createIcon(1024, 'adaptive-icon.png');
  await createIcon(48, 'favicon.png');
  await createSplash();
  
  console.log('\n✨ All icons generated successfully!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
