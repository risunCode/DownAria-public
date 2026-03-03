/**
 * Copy CHANGELOG.md from project root to public/ before build
 * This ensures the changelog page always renders the latest version.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'CHANGELOG.md');
const DEST = path.join(__dirname, '..', 'public', 'Changelog.md');

try {
  if (!fs.existsSync(SRC)) {
    console.warn('[Changelog] CHANGELOG.md not found at root, skipping copy.');
    process.exit(0);
  }

  fs.copyFileSync(SRC, DEST);
  console.log(`[Changelog] Copied CHANGELOG.md → public/Changelog.md`);
} catch (err) {
  console.error('[Changelog] Failed to copy:', err.message);
  process.exit(1);
}
