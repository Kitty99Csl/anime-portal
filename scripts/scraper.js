/**
 * scripts/scraper.js
 * AniWatch-BJ88 — Data scraper v3
 * Node 20+ native fetch (no dependencies needed)
 *
 * FIX v3: Scrape category archive pages (not homepage pagination)
 * anime-th.com categories:
 *   /category/ซับไทย/        — Thai sub (hundreds of pages)
 *   /category/พากย์ไทย/      — Thai dub (hundreds of pages)
 *   /category/อนิเมะจีนซับไทย/ — Chinese anime Thai sub
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = path.join(__dirname, '../src/data');
const BASE_URL  = 'https://anime-th.com';
const AJAX_URL  = `${BASE_URL}/wp-admin/admin-ajax.php`;

// Category archive URLs to scrape (these contain the real 4000+ anime)
const CATEGORY_URLS = [
  `${BASE_URL}/category/%e0%b8%8b%e0%b8%b1%e0%b8%9a%e0%b9%84%e0%b8%97%e0%b8%a2`,           // ซับไทย
  `${BASE_URL}/category/%e0%b8%9e%e0%b8%b2%e0%b8%81%e0%b8%a2%e0%b9%8c%e0%b9%84%e0%b8%97%e0%b8%a2`, // พากย์ไทย
  `${BASE_URL}/category/%e0%b8%ad%e0%b8%99%e0%b8%b4%e0%b9%80%e0%b8%a1%e0%b8%b0%e0%b8%88%e0%b8%b5%e0%b8%99%e0%b8%8b%e0%b8%b1%e0%b8%9a%e0%b9%84%e0%b8%97%e0%b8%a2`, // อนิเมะจีนซับไทย
];

// Browser-like headers — required to pass Cloudflare checks
const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'th,en-US;q=0.9,en;q=0.8',
  'Referer':         `${BASE_URL}/`,
  'Origin':          BASE_URL,
};

const AJAX_HEADERS = {
  ...HEADERS,
  'Accept':          'application/json, text/javascript, */*; q=0.01',
  'Content-Type':    'application/x-www-form-urlencoded; charset=UTF-8',
  'X-Requested-With':'XMLHttpRequest',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// POST to AJAX endpoint with retry logic
async function postAjax(body, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(AJAX_URL, {
        method:  'POST',
        headers: AJAX_HEADERS,
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        console.warn(`  ⚠️  Non-JSON response (${text.slice(0,80)})`);
        return null;
      }
    } catch (err) {
      console.warn(`  ⚠️  Retry ${i+1}/${retries}: ${err.message}`);
      await sleep(3000 * (i + 1));
    }
  }
  return null;
}

// Extract iframe URL from player HTML
function extractIframeSrc(html = '') {
  const m = html.match(/src=["'](https?:\/\/[^"']+)["']/);
  return m ? m[1] : null;
}

// Extract anime slugs from a single HTML page
function extractSlugsFromHtml(html) {
  // Match /anime/slug/ links specifically
  const pattern = /href="https?:\/\/anime-th\.com\/anime\/([^/"]+)\/?"/g;
  const found = [...html.matchAll(pattern)]
    .map(m => m[1])
    .filter(s => s && s.length > 2 && !s.includes('page'));
  return [...new Set(found)];
}

// Scrape all category archives to collect anime slugs
async function getAnimeSlugs(maxPagesPerCategory = 200) {
  console.log('📋 Scanning category archive pages...\n');
  const slugSet = new Set();

  for (const categoryBase of CATEGORY_URLS) {
    // Decode for display
    const catName = decodeURIComponent(categoryBase.split('/category/')[1]);
    console.log(`\n📂 Category: ${catName}`);
    console.log(`   URL: ${categoryBase}`);

    let emptyCount = 0;

    for (let page = 1; page <= maxPagesPerCategory; page++) {
      const url = page === 1
        ? `${categoryBase}/`
        : `${categoryBase}/page/${page}/`;

      try {
        const res = await fetch(url, { headers: HEADERS });

        // 404 = no more pages for this category
        if (res.status === 404) {
          console.log(`   Page ${page}: 404 — end of category`);
          break;
        }
        if (!res.ok) {
          console.log(`   Page ${page}: HTTP ${res.status} — skipping`);
          continue;
        }

        const html = await res.text();
        const found = extractSlugsFromHtml(html);
        const prevSize = slugSet.size;

        if (found.length === 0) {
          emptyCount++;
          console.log(`   Page ${page}: 0 anime found (${emptyCount} empty)`);
          if (emptyCount >= 3) { console.log('   3 empty pages — moving to next category'); break; }
        } else {
          emptyCount = 0;
          found.forEach(s => slugSet.add(s));
          const newThisPage = slugSet.size - prevSize;
          console.log(`   Page ${page}: ${found.length} found, ${newThisPage} new (total: ${slugSet.size})`);
        }

        await sleep(1200 + Math.random() * 800);

      } catch (err) {
        console.error(`   ❌ Page ${page} error: ${err.message}`);
        emptyCount++;
        if (emptyCount >= 3) break;
      }
    }
  }

  console.log(`\n📋 Total unique slugs found: ${slugSet.size}`);
  return [...slugSet];
}

// Scrape detail page for a single anime slug
async function scrapeAnimeDetail(slug) {
  const url = `${BASE_URL}/anime/${slug}/`;
  const res  = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // Extract WordPress post IDs
  const postId   = (html.match(/['"](post_id|postID)['"]\s*:\s*['"]*(\d{4,7})/)?.[2])  ||
                   (html.match(/post_id=(\d{4,7})/)?.[1]) || null;

  // season_id lives in <option value="117398"> inside the season selector
  const seasonId = (html.match(/<option[^>]+value=["'](\d{4,7})["'][^>]*>\s*Season/i)?.[1]) ||
                   (html.match(/['"](season_id|seasonID)['"]\s*:\s*['"]*(\d{4,7})/)?.[2]) ||
                   (html.match(/season_id=(\d{4,7})/)?.[1]) || null;

  // Title — try og:title first, then h1
  const title = (html.match(/<meta property="og:title" content="([^"]+)"/)?.[1]) ||
                (html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)/)?.[1]) ||
                (html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1]) || slug;

  // Cover image — prefer TMDB, fallback to og:image
  const tmdb  = html.match(/https:\/\/image\.tmdb\.org\/t\/p\/[^"'\s]+/)?.[0];
  const ogImg = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  const cover = tmdb || ogImg || null;

  // Description
  const desc = html.match(/<meta property="og:description" content="([^"]+)"/)?.[1] || '';

  // Genre tags
  const genreMatches = [...html.matchAll(/class="[^"]*genre[^"]*"[^>]*>([^<]+)</gi)];
  const genres = [...new Set(genreMatches.map(m => m[1].trim()).filter(Boolean))].slice(0, 4);

  // Episode count — from JSON-LD schema (most reliable)
  // JSON-LD has: "numberOfEpisodes":12
  const jsonLdMatch = html.match(/"numberOfEpisodes"\s*:\s*(\d+)/);
  const epOptionMatch = html.match(/Season\s*\d+\s*\(\s*(\d+)\s*episodes?\s*\)/i);
  const episodeCountFromPage = jsonLdMatch  ? parseInt(jsonLdMatch[1])  :
                               epOptionMatch ? parseInt(epOptionMatch[1]) : 0;

  // Year
  const year = parseInt(html.match(/\b(202[0-9]|203\d|201\d)\b/)?.[0] || '2025');

  // Status — multi-signal detection (Thai keywords across page)
  // Signal 1: dedicated status element
  const statusEl = html.match(/class="[^"]*status[^"]*"[^>]*>([^<]+)</i)?.[1]?.trim() || '';
  // Signal 2: category links (พากย์ไทย pages often tag จบแล้ว in breadcrumb/cats)
  const catText  = (html.match(/class="[^"]*cat[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/gi) || []).join(' ');
  // Signal 3: full page text scan for status keywords
  const bodySnip = html.slice(0, 15000); // check first 15KB only (header/meta area)
  const allText  = (statusEl + ' ' + catText + ' ' + bodySnip).toLowerCase();

  const isComplete = allText.includes('จบแล้ว') || allText.includes('จบสมบูรณ์') ||
                     allText.includes('ครบแล้ว') || allText.includes('complete') ||
                     allText.includes('จบ ');
  const isUpcoming = allText.includes('เร็วๆ นี้') || allText.includes('upcoming') ||
                     allText.includes('เร็วๆนี้') || allText.includes('coming soon');

  // Signal 4: slug-based hints (some slugs include -end, -complete)
  const slugLower = slug.toLowerCase();
  const slugComplete = slugLower.includes('-end') || slugLower.includes('-complete') ||
                       slugLower.includes('complete');

  const status = (isComplete || slugComplete) ? 'complete'
               : isUpcoming ? 'upcoming'
               : 'airing';

  return {
    slug,
    title_th:      title.trim(),
    title_en:      slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    post_id:       postId   ? parseInt(postId)   : null,
    season_id:     seasonId ? parseInt(seasonId) : null,
    cover_url:     cover,
    desc:          desc.slice(0, 300),
    genres,
    year,
    status,
    episode_count: episodeCountFromPage,
    source_url:    url,
    scraped_at:    new Date().toISOString(),
    _html:         html,  // temp: passed to getEpisodesFromHtml, not saved to JSON
  };
}

// Get episode list directly from HTML (no AJAX needed)
// Episodes are rendered as: <button data-episode-id="117400" data-lang="th-sound">01</button>
function getEpisodesFromHtml(html) {
  const episodes = [];
  const seen = new Set();
  const pattern = /data-episode-id=["'](\d+)["'][^>]*data-lang=["']([^"']+)["'][^>]*>\s*(\d+)\s*</g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const id = parseInt(match[1]);
    const lang = match[2];
    const num = match[3].padStart(2, '0');
    const key = `${id}-${num}`;
    if (!seen.has(key)) {
      seen.add(key);
      episodes.push({
        id,
        number: parseInt(match[3]),
        title: `EP.${num}`,
        has_sub: lang.includes('soundtrack') || lang.includes('sub'),
        has_dub: lang.includes('th-sound') || lang.includes('dub'),
        video_url: null,
      });
    }
  }
  // Sort by episode number
  return episodes.sort((a, b) => a.number - b.number);
}

// Get video URL for one episode
async function getVideoUrl(post_id) {
  const data = await postAjax(`action=mix_get_player&post_id=${post_id}&lang=soundtrack`);
  if (!data?.success) return null;
  return extractIframeSrc(data.player || data.html || '');
}

// ── MAIN ──────────────────────────────────────────────────
async function main() {
  console.log('🚀 AniWatch-BJ88 Scraper v3\n');
  console.log('Strategy: category archive pages (ซับไทย + พากย์ไทย + จีนซับไทย)\n');

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const animePath   = path.join(DATA_DIR, 'anime.json');
  const episodePath = path.join(DATA_DIR, 'episodes.json');

  let existing     = fs.existsSync(animePath)   ? JSON.parse(fs.readFileSync(animePath,   'utf8')) : [];
  let episodeStore = fs.existsSync(episodePath)  ? JSON.parse(fs.readFileSync(episodePath, 'utf8')) : [];

  // Build lookup map: slug → index in existing array (for updates)
  const slugIndexMap  = new Map(existing.map((a, i) => [a.slug, i]));
  const episodeMap    = Object.fromEntries(episodeStore.map(e => [e.anime_slug, e.episodes]));

  // Step 1: Collect all slugs from category archives
  const allSlugs = await getAnimeSlugs(200);

  // Separate: new slugs (never scraped) vs existing (already have data)
  const newSlugs      = allSlugs.filter(s => !slugIndexMap.has(s));
  const existingSlugs = allSlugs.filter(s => slugIndexMap.has(s));

  console.log(`\n✅ ${allSlugs.length} total slugs`);
  console.log(`   ${newSlugs.length} new to scrape`);
  console.log(`   ${existingSlugs.length} already in database\n`);

  if (newSlugs.length === 0) {
    console.log('No new anime found — database is up to date.');
  }

  // Step 2-4: Scrape new anime — limit per run to avoid timeout
  const MAX_PER_RUN = 150; // ~12 min safe. Runs stack up weekly to build full library.
  const slugsThisRun = newSlugs.slice(0, MAX_PER_RUN);
  if (newSlugs.length > MAX_PER_RUN) {
    console.log(`⚡ Capped at ${MAX_PER_RUN} this run — ${newSlugs.length - MAX_PER_RUN} remaining for next run\n`);
  }

  let added = 0;
  for (const slug of slugsThisRun) {
    console.log(`\n▶ ${slug}`);
    await sleep(1000 + Math.random() * 800);

    try {
      const detail = await scrapeAnimeDetail(slug);
      console.log(`  title: ${detail.title_th} | status: ${detail.status} | post_id: ${detail.post_id} | season_id: ${detail.season_id}`);

      // Extract episodes directly from already-fetched HTML (no extra request)
      let episodes = getEpisodesFromHtml(detail._html || '');
      console.log(`  episodes from HTML: ${episodes.length}`);

      // Fallback: if no episodes in HTML, try AJAX with season_id
      if (episodes.length === 0 && detail.season_id) {
        await sleep(600);
        const data = await postAjax(`action=get_episode_list&season_id=${detail.season_id}`);
        if (data) {
          const arr = data?.soundtrack?.data || data?.['th-sound']?.data || data?.data || [];
          episodes = arr.map((ep, i) => ({
            id: ep.id,
            number: parseInt(ep.title || ep.number || i+1),
            title: `EP.${String(ep.title || ep.number || i+1).padStart(2,'0')}`,
            has_sub: true,
            has_dub: !!(data?.['th-sound']),
            video_url: null,
          }));
          console.log(`  episodes from AJAX: ${episodes.length}`);
        }
      }

      const { _html, ...detailClean } = detail; // strip temp HTML before saving
      const saveEntry = { ...detailClean, episode_count: episodes.length };

      if (slugIndexMap.has(slug)) {
        // UPDATE existing entry — preserve any manual fixes, update episode count
        const idx = slugIndexMap.get(slug);
        existing[idx] = { ...existing[idx], ...saveEntry };
      } else {
        // ADD new entry
        existing.push(saveEntry);
        slugIndexMap.set(slug, existing.length - 1);
      }
      episodeMap[slug] = episodes;
      added++;

    } catch (err) {
      console.error(`  ❌ ${err.message}`);
    }

    // Save incrementally every 50 anime (safety net for long runs)
    if (added > 0 && added % 50 === 0) {
      fs.writeFileSync(animePath, JSON.stringify(existing, null, 2));
      fs.writeFileSync(episodePath, JSON.stringify(
        Object.entries(episodeMap).map(([anime_slug, episodes]) => ({ anime_slug, episodes })),
        null, 2
      ));
      console.log(`\n💾 Checkpoint saved: ${existing.length} anime total\n`);
    }
  }

  // Final save
  fs.writeFileSync(animePath,   JSON.stringify(existing, null, 2));
  fs.writeFileSync(episodePath, JSON.stringify(
    Object.entries(episodeMap).map(([anime_slug, episodes]) => ({ anime_slug, episodes })),
    null, 2
  ));

  console.log(`\n💾 anime.json    → ${existing.length} anime`);
  console.log(`💾 episodes.json → ${Object.keys(episodeMap).length} anime with episodes`);
  console.log(`\n✅ Done! Added ${added} new anime.`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
