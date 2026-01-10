const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');

// PNG magic bytes
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
// UTF-8 BOM that's corrupting our files
const UTF8_BOM = Buffer.from([239, 191, 189]);

function fixPngFile(filePath) {
  const data = fs.readFileSync(filePath);
  
  // Check if file starts with UTF-8 BOM followed by PNG signature (without first byte)
  if (data[0] === 239 && data[1] === 191 && data[2] === 189 && data[3] === 80) {
    console.log(`🔧 Fixing ${path.basename(filePath)} - removing UTF-8 BOM...`);
    
    // Remove the first 3 bytes (BOM) and add back the missing first PNG byte (137)
    const fixedData = Buffer.concat([
      Buffer.from([137]), // First PNG signature byte that was replaced by BOM
      data.slice(3) // Rest of file after BOM
    ]);
    
    fs.writeFileSync(filePath, fixedData);
    console.log(`   ✅ Fixed! New header: ${Array.from(fixedData.slice(0, 8)).join(',')}`);
    return true;
  } else if (data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71) {
    console.log(`✅ ${path.basename(filePath)} - Already valid PNG`);
    return false;
  } else {
    console.log(`❌ ${path.basename(filePath)} - Unknown format: ${Array.from(data.slice(0, 8)).join(',')}`);
    return false;
  }
}

console.log('🔍 Checking PNG files in assets folder...\n');

const pngFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.png'));

let fixedCount = 0;
for (const file of pngFiles) {
  if (fixPngFile(path.join(assetsDir, file))) {
    fixedCount++;
  }
}

console.log(`\n✨ Done! Fixed ${fixedCount} files.`);
