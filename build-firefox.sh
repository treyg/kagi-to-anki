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

// Add data_collection_permissions - array must have at least 1 item
if (manifest.browser_specific_settings && manifest.browser_specific_settings.gecko) {
  manifest.browser_specific_settings.gecko.data_collection_permissions = {
    required: ['none']
  };
}

fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
console.log('Firefox manifest patched');
"

echo "Firefox build ready in dist/"
