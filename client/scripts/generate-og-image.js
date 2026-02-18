#!/usr/bin/env node

/**
 * Generate Open Graph image (og-image.png) from banner logo
 * 
 * Creates a 1200x630 image optimized for social media link previews.
 * Uses letterboxing (white background) to preserve aspect ratio.
 * 
 * Usage:
 *   node scripts/generate-og-image.js
 * 
 * Requires: sharp (already installed)
 */

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '../src/assets/glad-libs-brunette-girl.png');
const outputPath = path.join(__dirname, '../public/og-image.png');

// Target dimensions for Open Graph images
const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 630;

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

async function generateOGImage() {
  try {
    console.log('Generating Open Graph image from:', sourcePath);
    console.log(`Target dimensions: ${TARGET_WIDTH}x${TARGET_HEIGHT}`);
    
    // Get source image metadata
    const metadata = await sharp(sourcePath).metadata();
    console.log(`Source image: ${metadata.width}x${metadata.height}`);
    
    // Calculate scaling to fit within target dimensions while preserving aspect ratio
    const sourceAspect = metadata.width / metadata.height;
    const targetAspect = TARGET_WIDTH / TARGET_HEIGHT;
    
    let resizeWidth, resizeHeight;
    
    if (sourceAspect > targetAspect) {
      // Source is wider - fit to width, letterbox top/bottom
      resizeWidth = TARGET_WIDTH;
      resizeHeight = Math.round(TARGET_WIDTH / sourceAspect);
    } else {
      // Source is taller - fit to height, letterbox left/right
      resizeHeight = TARGET_HEIGHT;
      resizeWidth = Math.round(TARGET_HEIGHT * sourceAspect);
    }
    
    console.log(`Resizing to: ${resizeWidth}x${resizeHeight}`);
    
    // Create the image: resize source, then extend to exact target dimensions with white background
    await sharp(sourcePath)
      .resize(resizeWidth, resizeHeight, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .extend({
        top: Math.floor((TARGET_HEIGHT - resizeHeight) / 2),
        bottom: Math.ceil((TARGET_HEIGHT - resizeHeight) / 2),
        left: Math.floor((TARGET_WIDTH - resizeWidth) / 2),
        right: Math.ceil((TARGET_WIDTH - resizeWidth) / 2),
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(outputPath);
    
    console.log(`✓ Generated ${outputPath}`);
    console.log(`  Final dimensions: ${TARGET_WIDTH}x${TARGET_HEIGHT}`);
    console.log('\nOpen Graph image generated successfully!');
  } catch (error) {
    console.error('Error generating Open Graph image:', error.message);
    process.exit(1);
  }
}

generateOGImage();

