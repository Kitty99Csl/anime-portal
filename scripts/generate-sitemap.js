/**
 * scripts/generate-sitemap.js
 * AniWatch-BJ88 — Sitemap generator
 * Run: node scripts/generate-sitemap.js
 * Output: public/sitemap.xml (served by Cloudflare Worker)
 *
 * Run this after every scraper run, or add to weekly-sync.yml
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ANIME_PATH = path.join(__dirname, '../src/data/anime.json');
const OUT_PATH   = path.join(__dirname, '../public/sitemap.xml');
const SITE_URL   = 'https://anime.bj88la.net';
const TODAY      = new Date().toISOString().split('T')[0];

// Ensure output directory exists
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

// Load anime data
const anime = JSON.parse(fs.readFileSync(ANIME_PATH, 'utf8'));
console.log(`📋 Loaded ${anime.length} anime`);

// Static pages
const staticPages = [
  { url: '/',            priority: '1.0', changefreq: 'daily'   },
  { url: '/policy.html', priority: '0.3', changefreq: 'monthly' },
];

// Build XML
const urls = [
  // Static pages
  ...staticPages.map(p => `
  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`),

  // Anime pages — link to source (since our site is SPA with hash routing)
  // Priority: airing=0.9, complete=0.7, upcoming=0.5
  ...anime.map(a => {
    const priority = a.status === 'airing' ? '0.9'
                   : a.status === 'complete' ? '0.7'
                   : '0.5';
    return `
  <url>
    <loc>${SITE_URL}/?anime=${encodeURIComponent(a.slug)}</loc>
    <lastmod>${a.scraped_at ? a.scraped_at.split('T')[0] : TODAY}</lastmod>
    <changefreq>${a.status === 'airing' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }),
].join('');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls}
</urlset>`;

fs.writeFileSync(OUT_PATH, xml, 'utf8');

const sizeKB = Math.round(fs.statSync(OUT_PATH).size / 1024);
console.log(`✅ sitemap.xml → ${OUT_PATH}`);
console.log(`   ${staticPages.length + anime.length} URLs | ${sizeKB} KB`);
console.log(`   Submit to: https://search.google.com/search-console`);
