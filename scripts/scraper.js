/**
 * scripts/scraper.js
 * ─────────────────────────────────────────────────────────
 * Calls anime-th.com's WordPress AJAX API (discovered via HAR)
 * and saves the result to src/data/anime.json + episodes.json
 *
 * Two real API endpoints found in HAR:
 *   POST /wp-admin/admin-ajax.php  action=get_episode_list&season_id=XXX
 *   POST /wp-admin/admin-ajax.php  action=mix_get_player&post_id=XXX&lang=soundtrack
 *
 * Run: node scripts/scraper.js
 */

import fetch  from 'node-fetch';
import fs     from 'fs';
import path   from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = path.join(__dirname, '../src/data');

const BASE_URL  = 'https://anime-th.com';
const AJAX_URL  = `${BASE_URL}/wp-admin/admin-ajax.php`;

// ── Headers that mimic a real browser (important for Cloudflare) ─────────
const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'th,en-US;q=0.9,en;q=0.8',
  'Referer':         `${BASE_URL}/`,
  'Origin':          BASE_URL,
  'X-Requested-With':'XMLHttpRequest',
};

// ── Helpers ──────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function postAjax(body, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(AJAX_URL, {
        method:  'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`  ⚠️  Retry ${i+1}/${retries}: ${err.message}`);
      await sleep(3000 * (i + 1));
    }
  }
  throw new Error(`Failed after ${retries} retries`);
}

// Extract iframe src from player HTML
function extractIframeSrc(playerHtml = '') {
  const m = playerHtml.match(/src="(https:\/\/anime\.tonytonychopper\.net\/v\/[^"]+)"/);
  return m ? m[1] : null;
}

// ── Step 1: Get anime listing page slugs ─────────────────
async function getAnimeListSlugs() {
  console.log('📋 Fetching anime listing pages...');
  const slugs = [];
  let page = 1;

  while (true) {
    const url  = page === 1 ? `${BASE_URL}/` : `${BASE_URL}/page/${page}/`;
    const res  = await fetch(url, { headers: HEADERS });
    const html = await res.text();

    // Extract anime slugs from links like /anime/SLUG/
    const matches = [...html.matchAll(/href="https:\/\/anime-th\.com\/anime\/([^/"]+)\/"/g)];
    const newSlugs = [...new Set(matches.map(m => m[1]))];

    if (newSlugs.length === 0) break;

    slugs.push(...newSlugs);
    console.log(`  Page ${page}: found ${newSlugs.length} anime (total: ${slugs.length})`);

    page++;
    await sleep(1500 + Math.random() * 1000);

    // Safety cap — remove for full crawl
    if (page > 5) break;
  }

  return [...new Set(slugs)]; // deduplicate
}

// ── Step 2: Scrape detail page for a single anime ────────
async function scrapeAnimeDetail(slug) {
  const url  = `${BASE_URL}/anime/${slug}/`;
  const res  = await fetch(url, { headers: HEADERS });
  const html = await res.text();

  // Extract post_id from the page (WP uses it in data attributes or inline JS)
  const postIdMatch  = html.match(/post_id['":\s]+(\d{5,6})/);
  const seasonIdMatch= html.match(/season_id['":\s]+(\d{5,6})/);
  const titleMatch   = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const coverMatch   = html.match(/property="og:image" content="([^"]+)"/);

  // TMDB image is often in the page source too
  const tmdbMatch    = html.match(/image\.tmdb\.org\/t\/p\/[^"]+/);

  return {
    slug,
    post_id:   postIdMatch   ? parseInt(postIdMatch[1])   : null,
    season_id: seasonIdMatch ? parseInt(seasonIdMatch[1]) : null,
    title:     titleMatch    ? titleMatch[1].trim()       : slug,
    cover_url: tmdbMatch     ? `https://${tmdbMatch[0]}`  : (coverMatch ? coverMatch[1] : null),
    source_url: url,
    scraped_at: new Date().toISOString(),
  };
}

// ── Step 3: Get episode list for an anime ────────────────
async function getEpisodeList(season_id) {
  const data = await postAjax(`action=get_episode_list&season_id=${season_id}`);
  const soundtrack = data?.soundtrack?.data || [];
  return soundtrack.map(ep => ({
    id:            ep.id,
    number:        ep.number,
    title:         ep.title,
    full_title:    ep.full_title,
    has_video:     ep.has_video,
    has_th_sound:  ep.has_th_sound,
    has_subtitle:  ep.has_soundtrack,
  }));
}

// ── Step 4: Get video iframe URL for one episode ─────────
async function getPlayerUrl(post_id, lang = 'soundtrack') {
  const data = await postAjax(`action=mix_get_player&post_id=${post_id}&lang=${lang}`);
  if (!data?.success) return null;
  return extractIframeSrc(data.player || '');
}

// ── MAIN ─────────────────────────────────────────────────
async function main() {
  console.log('🚀 AniWatch TH Scraper starting...\n');

  // Load existing data (for incremental updates)
  let existing = [];
  const animePath   = path.join(DATA_DIR, 'anime.json');
  const episodePath = path.join(DATA_DIR, 'episodes.json');
  if (fs.existsSync(animePath)) {
    existing = JSON.parse(fs.readFileSync(animePath, 'utf8'));
  }
  const existingSlugs = new Set(existing.map(a => a.slug));

  // Step 1: Get all slugs
  const slugs = await getAnimeListSlugs();
  const newSlugs = slugs.filter(s => !existingSlugs.has(s));
  console.log(`\n✅ Found ${slugs.length} total, ${newSlugs.length} new\n`);

  const animeList   = [...existing];
  const episodeMap  = {};

  // Load existing episodes
  if (fs.existsSync(episodePath)) {
    const epData = JSON.parse(fs.readFileSync(episodePath, 'utf8'));
    epData.forEach(e => { episodeMap[e.anime_slug] = e.episodes; });
  }

  // Step 2-4: Process each new anime
  for (const slug of newSlugs) {
    console.log(`\n📺 Processing: ${slug}`);
    await sleep(1500 + Math.random() * 1000);

    try {
      // Get detail
      const detail = await scrapeAnimeDetail(slug);
      console.log(`  ✓ post_id=${detail.post_id}, season_id=${detail.season_id}`);

      if (!detail.season_id) {
        console.log(`  ⚠️  No season_id found, skipping episodes`);
        animeList.push(detail);
        continue;
      }

      // Get episodes
      await sleep(800);
      const episodes = await getEpisodeList(detail.season_id);
      console.log(`  ✓ ${episodes.length} episodes found`);

      // Get video URL for EP1 only (to validate)
      if (episodes.length > 0) {
        await sleep(800);
        const videoUrl = await getPlayerUrl(episodes[0].id);
        if (videoUrl) {
          episodes[0].video_url = videoUrl;
          console.log(`  ✓ EP1 video: ${videoUrl}`);
        }
      }

      animeList.push({ ...detail, episode_count: episodes.length });
      episodeMap[slug] = episodes;

    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
  }

  // Save
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(animePath, JSON.stringify(animeList, null, 2));
  console.log(`\n💾 Saved ${animeList.length} anime to src/data/anime.json`);

  const epArray = Object.entries(episodeMap).map(([anime_slug, episodes]) => ({ anime_slug, episodes }));
  fs.writeFileSync(episodePath, JSON.stringify(epArray, null, 2));
  console.log(`💾 Saved episodes for ${epArray.length} anime to src/data/episodes.json`);

  console.log('\n✅ Scrape complete!');
}

main().catch(console.error);
