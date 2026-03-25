/**
 * scripts/build.js
 * ─────────────────────────────────────────────────────────
 * Reads src/data/anime.json and injects it into src/pages/index.html
 * Output goes to dist/ — this is what gets deployed to Cloudflare Pages
 *
 * Run: node scripts/build.js
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC  = path.join(__dirname, '../src');
const DIST = path.join(__dirname, '../dist');

function readJSON(file) {
  const p = path.join(SRC, 'data', file);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
}

function build() {
  // Create dist folder
  fs.mkdirSync(DIST, { recursive: true });

  // Read data
  const anime    = readJSON('anime.json');
  const episodes = readJSON('episodes.json');

  console.log(`📦 Building with ${anime.length} anime, ${episodes.length} episode sets...`);

  // Read HTML template
  const indexPath = path.join(SRC, 'pages', 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ src/pages/index.html not found. Copy the demo HTML there first.');
    process.exit(1);
  }

  let html = fs.readFileSync(indexPath, 'utf8');

  // Inject data as a JSON variable into the <script> section
  const dataScript = `
  <script id="__ANIME_DATA__">
    window.__ANIME_DATA__    = ${JSON.stringify(anime)};
    window.__EPISODE_DATA__  = ${JSON.stringify(episodes)};
    window.__BUILD_DATE__    = "${new Date().toISOString()}";
    window.__TOTAL_ANIME__   = ${anime.length};
  </script>`;

  // Insert before closing </body>
  html = html.replace('</body>', `${dataScript}\n</body>`);

  // Write to dist
  fs.writeFileSync(path.join(DIST, 'index.html'), html);

  // Copy any static assets if they exist
  const publicDir = path.join(__dirname, '../public');
  if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, DIST, { recursive: true });
  }

  console.log(`✅ Built → dist/index.html`);
  console.log(`   Anime:    ${anime.length} titles`);
  console.log(`   Episodes: ${episodes.length} sets`);
  console.log(`   Built at: ${new Date().toLocaleString()}`);
}

build();
