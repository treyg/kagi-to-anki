#!/bin/bash
# Build for Chrome Web Store - removes key field from manifest

echo "Building extension..."
npm run build

echo "Patching manifest for Chrome Web Store..."
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('dist/manifest.json', 'utf8'));

// Remove 'key' field - not allowed in Chrome Web Store uploads
delete manifest.key;

// Remove browser_specific_settings (Firefox-only)
delete manifest.browser_specific_settings;

fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
console.log('Chrome Web Store manifest patched (removed key and browser_specific_settings)');
"

echo "Chrome Web Store build ready in dist/"
echo ""
echo "To create package:"
echo "  cd dist && zip -r ../kagi-to-anki-chrome-v1.0.0.zip . -x '*.DS_Store' && cd .."
