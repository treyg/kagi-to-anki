#!/bin/bash
# Build for Firefox - modifies manifest after build

echo "Building extension..."
npm run build

echo "Patching manifest for Firefox..."
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('dist/manifest.json', 'utf8'));

// Replace service_worker with scripts for Firefox
manifest.background = {
  scripts: ['src/background/index.js']
};

// Remove Chrome-specific 'key' field to avoid warning
delete manifest.key;

fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
console.log('Firefox manifest patched (removed key, changed to scripts)');
"

echo "Firefox build ready in dist/"
