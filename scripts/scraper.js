/**
 * scripts/scraper.js
 * AniWatch-BJ88 — Scraper v4 (FINAL)
 *
 * Smart logic:
 *  - NEW slugs     → scrape and add
 *  - STALE entries → rescrape if episode_count=0 OR genres=[]
 *  - GOOD entries  → skip entirely (saves time, avoids ban)
 *  - MAX_PER_RUN   → hard cap per run (new + stale combined)
 *  - Self-healing  → never need to manually clear JSON files
 *
 * Node 20+ native fetch, no dependencies
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = path.join(__dirname, '../src/data');
const BASE_URL  = 'https://anime-th.com';
const AJAX_URL  = `${BASE_URL}/wp-admin/admin-ajax.php`;

// ── SUPABASE CONFIG ───────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pzrzdljwglybljthbffl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cnpkbGp3Z2x5Ymxq' +
  'dGhiZmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzczNjUsImV4cCI6MjA5MDI1MzM2NX0.HzAKYcSQ_kjlKrf-HQSwVdwi_-J8aBnP6HinMDjfkTA';
const SITE_ID = 1;

const SB_HEADERS = {
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer':        'resolution=merge-duplicates',
};

async function sbQuery(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: SB_HEADERS,
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${path}: ${res.status} ${err.slice(0,200)}`);
  }
  return res.status === 204 ? null : res.json();
}

// Upsert anime row → returns id
async function sbUpsertAnime(data) {
  const row = {
    site_id:       SITE_ID,
    slug:          data.slug,
    title_th:      data.title_th,
    title_en:      data.title_en,
    cover_url:     data.cover_url,
    description:   data.desc,
    genres:        data.genres || [],
    year:          data.year,
    status:        data.status,
    episode_count: data.episode_count,
    post_id:       data.post_id,
    season_id:     data.season_id,
    source_url:    data.source_url,
    scraped_at:    data.scraped_at,
  };
  const result = await sbQuery('anime?on_conflict=site_id,slug&select=id', {
    method:  'POST',
    headers: { ...SB_HEADERS, 'Prefer': 'return=representation,resolution=merge-duplicates' },
    body:    JSON.stringify(row),
  });
  return result?.[0]?.id || null;
}

// Upsert episodes for an anime
async function sbUpsertEpisodes(animeId, episodes) {
  if (!animeId || !episodes.length) return;
  const rows = episodes.map(ep => ({
    anime_id:  animeId,
    number:    ep.number,
    title:     ep.title,
    has_sub:   ep.has_sub,
    has_dub:   ep.has_dub,
    video_url: ep.video_url || null,
  }));
  await sbQuery('episodes?on_conflict=anime_id,number', {
    method: 'POST',
    body:   JSON.stringify(rows),
  });
}

// Get all existing slugs from Supabase
async function sbGetExistingSlugs() {
  const data = await sbQuery(`anime?site_id=eq.${SITE_ID}&select=slug,episode_count,genres`);
  return data || [];
}

// Log crawl run
async function sbLogCrawl(added, fixed, total, durationS, status, notes) {
  await sbQuery('crawl_log', {
    method: 'POST',
    body:   JSON.stringify({ site_id: SITE_ID, added, fixed, total, duration_s: durationS, status, notes }),
  });
}

// Category archive URLs — all 3 contain the full library
const CATEGORY_URLS = [
  `${BASE_URL}/category/%e0%b8%8b%e0%b8%b1%e0%b8%9a%e0%b9%84%e0%b8%97%e0%b8%a2`,
  `${BASE_URL}/category/%e0%b8%9e%e0%b8%b2%e0%b8%81%e0%b8%a2%e0%b9%8c%e0%b9%84%e0%b8%97%e0%b8%a2`,
  `${BASE_URL}/category/%e0%b8%ad%e0%b8%99%e0%b8%b4%e0%b9%80%e0%b8%a1%e0%b8%b0%e0%b8%88%e0%b8%b5%e0%b8%99%e0%b8%8b%e0%b8%b1%e0%b8%9a%e0%b9%84%e0%b8%97%e0%b8%a2`,
];

// How many anime to process per run (new + stale combined)
// 150 ≈ 12 min — safe for GitHub Actions 20min timeout
const MAX_PER_RUN = 150;

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

// ── HELPERS ───────────────────────────────────────────────

async function postAjax(body, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(AJAX_URL, { method:'POST', headers:AJAX_HEADERS, body });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      try { return JSON.parse(text); } catch { return null; }
    } catch (err) {
      console.warn(`  ⚠️  Retry ${i+1}/${retries}: ${err.message}`);
      await sleep(3000 * (i + 1));
    }
  }
  return null;
}

function extractSlugsFromHtml(html) {
  const pattern = /href="https?:\/\/anime-th\.com\/anime\/([^/"]+)\/?"/g;
  return [...new Set(
    [...html.matchAll(pattern)].map(m => m[1]).filter(s => s?.length > 2 && !s.includes('page'))
  )];
}

function getEpisodesFromHtml(html) {
  const episodes = [];
  const seen = new Set();
  const pattern = /data-episode-id=["'](\d+)["'][^>]*data-lang=["']([^"']+)["'][^>]*>\s*(\d+)\s*</g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const id = parseInt(match[1]);
    const lang = match[2];
    const num = String(parseInt(match[3])).padStart(2, '0');
    const key = `${id}-${num}`;
    if (!seen.has(key)) {
      seen.add(key);
      episodes.push({
        id,
        number: parseInt(match[3]),
        title:   `EP.${num}`,
        has_sub: lang.includes('soundtrack') || lang.includes('sub'),
        has_dub: lang.includes('th-sound')   || lang.includes('dub'),
        video_url: null,
      });
    }
  }
  return episodes.sort((a, b) => a.number - b.number);
}

// ── SLUG COLLECTION ───────────────────────────────────────

async function getAnimeSlugs(maxPagesPerCategory = 200) {
  console.log('📋 Scanning category archive pages...\n');
  const slugSet = new Set();

  for (const categoryBase of CATEGORY_URLS) {
    const catName = decodeURIComponent(categoryBase.split('/category/')[1]);
    console.log(`\n📂 Category: ${catName}`);
    let emptyCount = 0;

    for (let page = 1; page <= maxPagesPerCategory; page++) {
      const url = page === 1 ? `${categoryBase}/` : `${categoryBase}/page/${page}/`;
      try {
        const res = await fetch(url, { headers: HEADERS });
        if (res.status === 404) { console.log(`   Page ${page}: end`); break; }
        if (!res.ok) { continue; }
        const html  = await res.text();
        const found = extractSlugsFromHtml(html);
        const prev  = slugSet.size;
        if (found.length === 0) {
          if (++emptyCount >= 3) { console.log('   3 empty pages — next category'); break; }
        } else {
          emptyCount = 0;
          found.forEach(s => slugSet.add(s));
          console.log(`   Page ${page}: ${found.length} found, ${slugSet.size - prev} new (total: ${slugSet.size})`);
        }
        await sleep(1000 + Math.random() * 600);
      } catch (err) {
        console.error(`   ❌ Page ${page}: ${err.message}`);
        if (++emptyCount >= 3) break;
      }
    }
  }

  console.log(`\n📋 Total unique slugs: ${slugSet.size}`);
  return [...slugSet];
}

// ── DETAIL SCRAPE ─────────────────────────────────────────

async function scrapeAnimeDetail(slug) {
  const url = `${BASE_URL}/anime/${slug}/`;
  const res  = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // Post ID
  const postId = (html.match(/['"](post_id|postID)['"]\s*:\s*['"]*(\d{4,7})/)?.[2]) ||
                 (html.match(/post_id=(\d{4,7})/)?.[1]) || null;

  // Season ID — in <option value="XXXXX">Season
  const seasonId = (html.match(/<option[^>]+value=["'](\d{4,7})["'][^>]*>\s*Season/i)?.[1]) ||
                   (html.match(/['"](season_id|seasonID)['"]\s*:\s*['"]*(\d{4,7})/)?.[2]) || null;

  // Title from og:title
  const title = (html.match(/<meta property="og:title" content="([^"]+)"/)?.[1]) ||
                (html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1]) || slug;

  // Cover — prefer TMDB
  const cover = html.match(/https:\/\/image\.tmdb\.org\/t\/p\/[^"'\s]+/)?.[0] ||
                html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] || null;

  // Description
  const desc = (html.match(/<meta property="og:description" content="([^"]+)"/)?.[1] || '').slice(0, 300);

  // Genres — multiple strategies
  let genres = [];

  // Strategy 1: JSON-LD "genre" array
  const jsonLdBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of jsonLdBlocks) {
    try {
      const jsonLd = JSON.parse(block[1]);
      const raw = Array.isArray(jsonLd.genre) ? jsonLd.genre
                : typeof jsonLd.genre === 'string' ? [jsonLd.genre] : [];
      const filtered = raw.filter(g => {
        const gl = g.toLowerCase();
        return g.length > 1 && !['ซับไทย','พากย์ไทย','อนิเมะจีนซับไทย',
          'soundtrack','sub','dub','thai sub','thai dub'].includes(gl);
      });
      if (filtered.length > 0) { genres = filtered.slice(0, 4); break; }
    } catch {}
  }

  // Strategy 2: TMDb/schema genre spans
  if (genres.length === 0) {
    const genreRe = /(?:genre|ประเภท)[^>]*>([^<]{2,30})</gi;
    const gMatches = [...html.matchAll(genreRe)];
    genres = [...new Set(gMatches.map(m => m[1].trim()).filter(g =>
      g.length > 1 && !['ซับไทย','พากย์ไทย','อนิเมะจีน'].includes(g)
    ))].slice(0, 4);
  }

  // Strategy 3: "Action & Adventure • Animation" pattern from TMDb descriptions
  if (genres.length === 0) {
    const descGenres = html.match(/Action[^<]*•[^<]*Animation|Romance|Fantasy|Adventure|Horror|Comedy|Drama|Sci-Fi/gi);
    if (descGenres) {
      genres = [...new Set(descGenres.flatMap(s => s.split(/[•|,]/)).map(g => g.trim()).filter(Boolean))].slice(0, 4);
    }
  }

  // Episode count from JSON-LD (most reliable)
  const epCount = parseInt(
    html.match(/"numberOfEpisodes"\s*:\s*(\d+)/)?.[1] ||
    html.match(/Season\s*\d+\s*\(\s*(\d+)\s*episodes?\s*\)/i)?.[1] ||
    '0'
  );

  // Year
  const year = parseInt(html.match(/\b(202[0-9]|203\d|201[0-9])\b/)?.[0] || '2025');

  // Status
  const body = html.slice(0, 20000).toLowerCase();
  const status = (body.includes('จบแล้ว') || body.includes('จบสมบูรณ์') || slug.includes('-end'))
    ? 'complete'
    : (body.includes('เร็วๆ นี้') || body.includes('upcoming'))
    ? 'upcoming'
    : 'airing';

  return {
    slug,
    title_th:      title.trim(),
    title_en:      slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    post_id:       postId   ? parseInt(postId)   : null,
    season_id:     seasonId ? parseInt(seasonId) : null,
    cover_url:     cover,
    desc,
    genres,
    year,
    status,
    episode_count: epCount,
    source_url:    url,
    scraped_at:    new Date().toISOString(),
    _html:         html, // stripped before saving
  };
}

// ── MAIN ─────────────────────────────────────────────────

async function main() {
  console.log('🚀 AniWatch-BJ88 Scraper v4\n');

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const startTime = Date.now();

  // ── LOAD FROM SUPABASE ──
  console.log('📡 Loading existing data from Supabase...');
  let sbExisting = [];
  try {
    sbExisting = await sbGetExistingSlugs();
    console.log(`   Found ${sbExisting.length} anime in Supabase`);
  } catch(err) {
    console.warn(`   ⚠️ Supabase load failed: ${err.message}`);
    console.warn('   Falling back to local anime.json');
  }

  // Also keep local JSON as backup/cache
  const animePath   = path.join(DATA_DIR, 'anime.json');
  const episodePath = path.join(DATA_DIR, 'episodes.json');
  let existing     = fs.existsSync(animePath)   ? JSON.parse(fs.readFileSync(animePath,   'utf8')) : [];
  let episodeStore = fs.existsSync(episodePath)  ? JSON.parse(fs.readFileSync(episodePath, 'utf8')) : [];

  // Merge Supabase data into local map
  const slugIndexMap = new Map(existing.map((a, i) => [a.slug, i]));
  sbExisting.forEach(a => {
    if (!slugIndexMap.has(a.slug)) {
      existing.push(a);
      slugIndexMap.set(a.slug, existing.length - 1);
    }
  });
  const episodeMap = Object.fromEntries(episodeStore.map(e => [e.anime_slug, e.episodes]));

  // ── STEP 1: Collect all slugs ──
  const allSlugs = await getAnimeSlugs(200);

  // ── STEP 2: Classify slugs ──
  const sbSlugMap = new Map(sbExisting.map(a => [a.slug, a]));
  const newSlugs   = allSlugs.filter(s => !sbSlugMap.has(s) && !slugIndexMap.has(s));
  const staleSlugs = allSlugs.filter(s => {
    const sbEntry  = sbSlugMap.get(s);
    const locEntry = slugIndexMap.has(s) ? existing[slugIndexMap.get(s)] : null;
    const a = sbEntry || locEntry;
    if (!a) return false;
    const missingEp     = !a.episode_count || a.episode_count === 0;
    const missingGenres = !a.genres || a.genres.length === 0;
    return missingEp || missingGenres;
  });

  console.log(`\n📊 Status:`);
  console.log(`   ${newSlugs.length} new anime to add`);
  console.log(`   ${staleSlugs.length} existing anime with missing data (will fix)`);
  console.log(`   ${allSlugs.length - newSlugs.length - staleSlugs.length} already complete (skipping)\n`);

  // Priority: new first, then stale
  const toProcess = [...newSlugs, ...staleSlugs].slice(0, MAX_PER_RUN);
  const remaining = [...newSlugs, ...staleSlugs].length - toProcess.length;

  if (remaining > 0) {
    console.log(`⚡ Processing ${toProcess.length} this run — ${remaining} remaining for next run\n`);
  }

  if (toProcess.length === 0) {
    console.log('✅ All anime up to date — nothing to process.');
  }

  // ── STEP 3: Scrape ──
  let processed = 0;
  for (const slug of toProcess) {
    const isNew = !slugIndexMap.has(slug);
    console.log(`\n▶ [${isNew ? 'NEW' : 'FIX'}] ${slug}`);
    await sleep(1200 + Math.random() * 800);

    try {
      const detail = await scrapeAnimeDetail(slug);
      console.log(`  title: ${detail.title_th.slice(0,50)} | ep: ${detail.episode_count} | genres: ${detail.genres.join(',') || 'none'} | status: ${detail.status}`);

      // Get episodes from HTML
      let episodes = getEpisodesFromHtml(detail._html || '');
      console.log(`  episodes from HTML: ${episodes.length}`);

      // Fallback to AJAX if needed
      if (episodes.length === 0 && detail.season_id) {
        await sleep(800);
        const data = await postAjax(`action=get_episode_list&season_id=${detail.season_id}`);
        if (data) {
          const arr = data?.soundtrack?.data || data?.['th-sound']?.data || data?.data || [];
          episodes = arr.map((ep, i) => ({
            id:        ep.id,
            number:    parseInt(ep.title || ep.number || i + 1),
            title:     `EP.${String(ep.title || ep.number || i + 1).padStart(2, '0')}`,
            has_sub:   true,
            has_dub:   !!(data?.['th-sound']),
            video_url: null,
          }));
          console.log(`  episodes from AJAX: ${episodes.length}`);
        }
      }

      const { _html, ...detailClean } = detail;
      const saveEntry = {
        ...detailClean,
        episode_count: episodes.length > 0 ? episodes.length : detail.episode_count,
      };

      // Save to Supabase
      let animeId = null;
      try {
        animeId = await sbUpsertAnime(saveEntry);
        if (animeId && episodes.length > 0) {
          await sbUpsertEpisodes(animeId, episodes);
        }
        console.log(`  ✅ Saved to Supabase (id: ${animeId})`);
      } catch(err) {
        console.warn(`  ⚠️ Supabase save failed: ${err.message} — saving to local JSON only`);
      }

      // Always save to local JSON as backup
      if (slugIndexMap.has(slug)) {
        const idx = slugIndexMap.get(slug);
        existing[idx] = { ...existing[idx], ...saveEntry };
      } else {
        existing.push(saveEntry);
        slugIndexMap.set(slug, existing.length - 1);
      }
      if (episodes.length > 0) episodeMap[slug] = episodes;
      processed++;

    } catch (err) {
      console.error(`  ❌ ${err.message}`);
    }

    // Checkpoint every 50
    if (processed > 0 && processed % 50 === 0) {
      fs.writeFileSync(animePath, JSON.stringify(existing, null, 2));
      fs.writeFileSync(episodePath, JSON.stringify(
        Object.entries(episodeMap).map(([anime_slug, episodes]) => ({ anime_slug, episodes })),
        null, 2
      ));
      console.log(`\n💾 Checkpoint: ${existing.length} anime saved\n`);
    }
  }

  // ── FINAL SAVE ──
  fs.writeFileSync(animePath, JSON.stringify(existing, null, 2));
  fs.writeFileSync(episodePath, JSON.stringify(
    Object.entries(episodeMap).map(([anime_slug, episodes]) => ({ anime_slug, episodes })),
    null, 2
  ));

  const goodCount = existing.filter(a => a.episode_count > 0 && a.genres?.length > 0).length;
  const durationS = Math.round((Date.now() - startTime) / 1000);

  console.log(`\n💾 anime.json    → ${existing.length} anime`);
  console.log(`💾 episodes.json → ${Object.keys(episodeMap).length} with episodes`);
  console.log(`📊 Complete data: ${goodCount} / ${existing.length} anime`);
  console.log(`\n✅ Done! Processed ${processed} anime in ${durationS}s`);
  if (remaining > 0) {
    console.log(`⚡ ${remaining} more to process — run workflow again to continue.`);
  }

  // Log to Supabase
  try {
    await sbLogCrawl(
      newSlugs.slice(0, MAX_PER_RUN).length,
      staleSlugs.slice(0, Math.max(0, MAX_PER_RUN - newSlugs.length)).length,
      existing.length,
      durationS,
      'success',
      remaining > 0 ? `${remaining} remaining` : 'complete'
    );
    console.log('📡 Crawl log saved to Supabase');
  } catch(err) {
    console.warn(`⚠️ Could not log to Supabase: ${err.message}`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
