/**
 * scripts/scraper.js
 * AniWatch-BJ88 — Data scraper
 * Node 20+ native fetch (no dependencies needed)
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = path.join(__dirname, '../src/data');
const BASE_URL  = 'https://anime-th.com';
const AJAX_URL  = `${BASE_URL}/wp-admin/admin-ajax.php`;

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

// GET listing pages and extract anime slugs
async function getAnimeSlugs(maxPages = 100) {
  console.log('📋 Scanning anime listing pages...');
  const slugSet = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? `${BASE_URL}/` : `${BASE_URL}/page/${page}/`;
    try {
      const res  = await fetch(url, { headers: HEADERS });
      if (!res.ok) break;
      const html = await res.text();

      // Match anime page links
      const matches = [...html.matchAll(/href="https:\/\/anime-th\.com\/anime\/([^/"]+)\/"/g)];
      const found   = matches.map(m => m[1]).filter(Boolean);

      if (found.length === 0) { console.log(`  Page ${page}: no anime found, stopping`); break; }

      found.forEach(s => slugSet.add(s));
      console.log(`  Page ${page}: ${found.length} anime (running total: ${slugSet.size})`);
      await sleep(2000 + Math.random() * 1000); // gentler at 100 pages

    } catch (err) {
      console.error(`  ❌ Page ${page} error: ${err.message}`);
      break;
    }
  }
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
  const seasonId = (html.match(/['"](season_id|seasonID)['"]\s*:\s*['"]*(\d{4,7})/)?.[2]) ||
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

  // Year
  const year = parseInt(html.match(/\b(202[3-9]|203\d)\b/)?.[0] || '2025');

  // Status
  const statusRaw = html.match(/class="[^"]*status[^"]*"[^>]*>([^<]+)</i)?.[1]?.trim().toLowerCase() || '';
  const status = statusRaw.includes('จบ') || statusRaw.includes('complete') ? 'complete'
               : statusRaw.includes('เร็ว') || statusRaw.includes('upcoming') ? 'upcoming'
               : 'airing';

  return {
    slug,
    title_th:   title.trim(),
    title_en:   slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    post_id:    postId   ? parseInt(postId)   : null,
    season_id:  seasonId ? parseInt(seasonId) : null,
    cover_url:  cover,
    desc:       desc.slice(0, 300),
    genres,
    year,
    status,
    source_url: url,
    scraped_at: new Date().toISOString(),
  };
}

// Get episode list from AJAX API
async function getEpisodes(season_id) {
  const data = await postAjax(`action=get_episode_list&season_id=${season_id}`);
  if (!data) return [];

  // API returns { soundtrack: { data: [...] }, ... }
  const arr = data?.soundtrack?.data || data?.data || [];
  return arr.map(ep => ({
    id:         ep.id,
    number:     ep.number || ep.ep_number,
    title:      ep.title  || `EP.${ep.number}`,
    has_sub:    !!(ep.has_soundtrack || ep.has_subtitle),
    has_dub:    !!(ep.has_th_sound),
    video_url:  null,
  }));
}

// Get video URL for one episode
async function getVideoUrl(post_id) {
  const data = await postAjax(`action=mix_get_player&post_id=${post_id}&lang=soundtrack`);
  if (!data?.success) return null;
  return extractIframeSrc(data.player || data.html || '');
}

// ── MAIN ──────────────────────────────────────────────────
async function main() {
  console.log('🚀 AniWatch-BJ88 Scraper v2\n');

  // Load existing data (incremental — only scrape new anime)
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const animePath   = path.join(DATA_DIR, 'anime.json');
  const episodePath = path.join(DATA_DIR, 'episodes.json');

  let existing     = fs.existsSync(animePath)   ? JSON.parse(fs.readFileSync(animePath,   'utf8')) : [];
  let episodeStore = fs.existsSync(episodePath)  ? JSON.parse(fs.readFileSync(episodePath, 'utf8')) : [];

  const existingSlugs = new Set(existing.map(a => a.slug));
  const episodeMap    = Object.fromEntries(episodeStore.map(e => [e.anime_slug, e.episodes]));

  // Step 1: Collect slugs
  const allSlugs = await getAnimeSlugs(5);
  const newSlugs = allSlugs.filter(s => !existingSlugs.has(s));
  console.log(`\n✅ ${allSlugs.length} total slugs · ${newSlugs.length} new to scrape\n`);

  if (newSlugs.length === 0) {
    console.log('Nothing new to scrape — database is up to date.');
  }

  // Step 2-4: Scrape each new anime
  let added = 0;
  for (const slug of newSlugs) {
    console.log(`\n▶ ${slug}`);
    await sleep(1000 + Math.random() * 800);

    try {
      const detail = await scrapeAnimeDetail(slug);
      console.log(`  title: ${detail.title_th} | post_id: ${detail.post_id} | season_id: ${detail.season_id}`);

      let episodes = [];
      if (detail.season_id) {
        await sleep(600);
        episodes = await getEpisodes(detail.season_id);
        console.log(`  episodes: ${episodes.length}`);

        // Fetch video URL for EP1 only
        if (episodes.length > 0 && episodes[0].id) {
          await sleep(600);
          const url = await getVideoUrl(episodes[0].id);
          if (url) {
            episodes[0].video_url = url;
            console.log(`  EP1 video: ${url}`);
          }
        }
      }

      existing.push({ ...detail, episode_count: episodes.length });
      episodeMap[slug] = episodes;
      added++;

    } catch (err) {
      console.error(`  ❌ ${err.message}`);
    }
  }

  // Save
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
