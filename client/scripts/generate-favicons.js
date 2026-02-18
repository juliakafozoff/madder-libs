#!/usr/bin/env node

/**
 * Generate favicon.ico, logo192.png, and logo512.png from favicon.png
 * 
 * Usage:
 *   node scripts/generate-favicons.js
 * 
 * Requires: sharp (npm install sharp --save-dev)
 */

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '../public/favicon.png');
const outputDir = path.join(__dirname, '../public');

// Check if source file exists
if (!fs.existsSync(sourcePath)) {
  console.error(`Error: Source file not found: ${sourcePath}`);
  process.exit(1);
}

// Try to use sharp if available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp is not installed.');
  console.error('Please install it by running: npm install sharp --save-dev');
  console.error('Or: yarn add sharp --dev');
  process.exit(1);
}

async function generateIcons() {
  try {
    console.log('Generating favicon icons from:', sourcePath);
    
    // Generate favicon.ico (16x16, 32x32, 48x48 sizes)
    await sharp(sourcePath)
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(path.join(outputDir, 'favicon.ico'));
    console.log('✓ Generated favicon.ico');
    
    // Generate logo192.png
    await sharp(sourcePath)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(path.join(outputDir, 'logo192.png'));
    console.log('✓ Generated logo192.png');
    
    // Generate logo512.png
    await sharp(sourcePath)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(path.join(outputDir, 'logo512.png'));
    console.log('✓ Generated logo512.png');
    
    console.log('\nAll favicon icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();

