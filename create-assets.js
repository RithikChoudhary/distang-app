const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, 'assets');

// Distang teal color scheme
const TEAL_PRIMARY = '#14B8A6';
const DARK_BG = '#0D1B2A';

async function createIcon(size, filename) {
  // Create a teal gradient icon with "D" letter
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#14B8A6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0D9488;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.2}"/>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" 
            font-family="Arial, sans-serif" font-weight="bold" 
            font-size="${size * 0.6}" fill="white">D</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(assetsDir, filename));
  
  console.log(`Created ${filename} (${size}x${size})`);
}

async function createSplash() {
  // Create splash screen with Distang branding
  const width = 1284;
  const height = 2778;
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0D1B2A;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#1B3A4B;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#065A60;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#14B8A6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0D9488;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
      
      <!-- Logo circle -->
      <circle cx="${width/2}" cy="${height/2 - 100}" r="120" fill="url(#logoGrad)"/>
      <text x="${width/2}" y="${height/2 - 70}" dominant-baseline="middle" text-anchor="middle" 
            font-family="Arial, sans-serif" font-weight="bold" 
            font-size="140" fill="white">D</text>
      
      <!-- App name -->
      <text x="${width/2}" y="${height/2 + 100}" dominant-baseline="middle" text-anchor="middle" 
            font-family="Arial, sans-serif" font-weight="bold" 
            font-size="72" fill="white">Distang</text>
      
      <!-- Tagline -->
      <text x="${width/2}" y="${height/2 + 180}" dominant-baseline="middle" text-anchor="middle" 
            font-family="Arial, sans-serif" 
            font-size="32" fill="#94A3B8">Stay Connected, Stay Close</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .resize(width, height)
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
  
  console.log(`Created splash.png (${width}x${height})`);
}

async function createAdaptiveIcon() {
  // Adaptive icon for Android (needs safe zone - 108dp with 66dp safe)
  const size = 1024;
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="adaptiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#14B8A6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0D9488;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#adaptiveGrad)"/>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" 
            font-family="Arial, sans-serif" font-weight="bold" 
            font-size="${size * 0.5}" fill="white">D</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));
  
  console.log(`Created adaptive-icon.png (${size}x${size})`);
}

async function main() {
  console.log('Creating Distang app assets...\n');
  
  // Backup old assets
  const backupDir = path.join(assetsDir, 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  const filesToBackup = ['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png'];
  for (const file of filesToBackup) {
    const src = path.join(assetsDir, file);
    if (fs.existsSync(src)) {
      fs.renameSync(src, path.join(backupDir, file));
    }
  }
  console.log('Backed up old assets\n');
  
  // Create new assets
  await createIcon(1024, 'icon.png');
  await createIcon(48, 'favicon.png');
  await createAdaptiveIcon();
  await createSplash();
  
  console.log('\n✅ All assets created successfully!');
}

main().catch(console.error);
