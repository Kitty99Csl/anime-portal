Here's the complete technical handoff:

---

## AniWatch-BJ88 — Full Technical Summary
*For Facebook auto-posting automation session*

---

## 1. SUPABASE TABLES

**Connection:**
```
URL: https://pzrzdljwglybljthbffl.supabase.co
Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cnpkbGp3Z2x5YmxqdGhiZmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzczNjUsImV4cCI6MjA5MDI1MzM2NX0.HzAKYcSQ_kjlKrf-HQSwVdwi_-J8aBnP6HinMDjfkTA
```

---

### Table: `sites`
```
id          serial primary key
domain      text unique          → 'anime.bj88la.net'
name        text                 → 'AniWatch-BJ88'
active      boolean              → true
created_at  timestamptz
```

---

### Table: `anime`
```
id            serial primary key
site_id       int → references sites(id), default 1
slug          text                → 'violet-evergarden'
title_th      text                → 'Violet Evergarden ไวโอเล็ต เอเวอร์การ์เดน'
title_en      text                → 'Violet Evergarden'
cover_url     text                → full https:// URL (see below)
description   text                → Thai description, max 300 chars
genres        text[]              → ['Drama','Fantasy']
year          int                 → 2026
status        text                → 'airing' | 'complete' | 'upcoming'
episode_count int                 → 13
post_id       int                 → WordPress post ID on anime-th.com (e.g. 117396)
season_id     int                 → WordPress season/term ID on anime-th.com
source_url    text                → 'https://anime-th.com/anime/violet-evergarden/'
scraped_at    timestamptz
created_at    timestamptz
updated_at    timestamptz

UNIQUE: (site_id, slug)
```

**What is `post_id`?**
anime-th.com runs WordPress. Each anime is a WordPress post. `post_id` is the WordPress post ID (e.g. `117396`). It's used by the scraper to call the site's AJAX endpoint to fetch episode lists:
```
POST https://anime-th.com/wp-admin/admin-ajax.php
action=get_episode_list&season_id=117398
```
Not needed for Facebook posting — ignore it.

**What does `cover_url` look like?**
Always a full `https://` URL. Two possible sources:
```
TMDB (most common):
https://image.tmdb.org/t/p/original/k8uBEraJWZf9o7oJbaVHrECwvjC.jpg

anime-th.com WordPress uploads (fallback):
https://anime-th.com/wp-content/uploads/2026/01/jqkDWnBDltFCjAdhxCqUWg9GXFB.jpg
```
Both are direct public image URLs — no auth needed.

---

### Table: `episodes`
```
id          serial primary key
anime_id    int → references anime(id) ON DELETE CASCADE
number      int                 → 1, 2, 3...
title       text                → 'EP.01'
has_sub     boolean             → true (ซับไทย)
has_dub     boolean             → false (พากย์ไทย)
video_url   text                → null (not stored — links out to source)
created_at  timestamptz

UNIQUE: (anime_id, number)
```

**How episodes link to anime:**
```sql
SELECT a.title_th, e.number, e.has_sub
FROM anime a
JOIN episodes e ON e.anime_id = a.id
WHERE a.slug = 'violet-evergarden'
ORDER BY e.number;
```

---

### Table: `banners`
```
id          serial primary key
site_id     int → references sites(id), default 1
slot_id     text    → 'leaderboard-top' | 'infeed' | 'below-player' | etc.
img_url     text    → full https:// banner image URL
click_url   text    → destination URL when clicked
html_code   text    → raw AdSense/HTML code (alternative to img_url)
type        text    → 'image' | 'code'
enabled     boolean → true/false
sort_order  int     → 0,1,2... (display order within slot)
created_at  timestamptz
updated_at  timestamptz
```

---

### Table: `admins`
```
id          serial primary key
site_id     int
username    text    → 'admin'
password    text    → 'bj88anime' (plain text, single admin)
role        text    → 'super_admin'
created_at  timestamptz
```

---

### Table: `crawl_log`
```
id          serial primary key
site_id     int
run_at      timestamptz
added       int     → new anime added this run
fixed       int     → stale anime fixed this run
total       int     → total anime in DB at time of run
duration_s  int     → seconds taken
status      text    → 'success' | 'partial' | 'failed'
notes       text    → e.g. '4017 remaining'
```

---

### RLS Policies summary
```
anime:      public SELECT, anon INSERT/UPDATE (scraper)
episodes:   public SELECT, anon INSERT/UPDATE (scraper)
banners:    public SELECT (enabled only), anon ALL (admin panel)
sites:      public SELECT
admins:     public SELECT (for login check)
crawl_log:  anon INSERT
```

---

### Useful Supabase REST queries for Facebook bot
```javascript
const SUPABASE_URL = 'https://pzrzdljwglybljthbffl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // full key above

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

// Get latest airing anime (for new episode posts)
GET /rest/v1/anime?site_id=eq.1&status=eq.airing&order=scraped_at.desc&limit=10&select=*

// Get a specific anime with episodes
GET /rest/v1/anime?slug=eq.violet-evergarden&select=*,episodes(*)

// Get anime scraped in last 24 hours (newly added)
GET /rest/v1/anime?site_id=eq.1&scraped_at=gte.2026-03-28T00:00:00Z&select=*

// Get anime by genre
GET /rest/v1/anime?genres=cs.{Fantasy}&select=title_th,cover_url,episode_count
```

---

## 2. TECH STACK

**Frontend:**
```
Single-file SPA — index.html (2500 lines, self-contained)
No framework — vanilla JavaScript
No build step — deploy as-is
Fonts: Cinzel (display), Sarabun (Thai body), Share Tech Mono
```

**Hosting:**
```
Cloudflare Workers (Static Assets mode)
Worker URL: anime-portal.kitokvk.workers.dev
Custom domain: anime.bj88la.net (CNAME → worker)
Auto-deploys on GitHub push via Cloudflare Pages integration
```

**Database:**
```
Supabase PostgreSQL (free tier)
Accessed via REST API (no SDK, raw fetch calls)
~218 anime rows currently (growing to 4359)
```

**Image/File Storage:**
```
NO Supabase Storage
NO Cloudinary
NO S3

Cover images: hotlinked directly from TMDB CDN
  → https://image.tmdb.org/t/p/original/...
  
Banner images: uploaded by admin, stored as external URLs
  → https://image.bj88laos.com/banner/... (your own image CDN)
  → Any public image URL works
```

**CDN:**
```
Cloudflare (automatic — all traffic goes through CF)
TMDB CDN for anime cover images
No additional CDN configured
```

**Scraper:**
```
Node.js 20 (native fetch, no dependencies)
Runs via GitHub Actions cron: Sunday 3am Bangkok
Source: anime-th.com (WordPress site)
Writes to: Supabase + local anime.json backup
150 anime per run, ~12-20 min
```

**GitHub repo:**
```
https://github.com/Kitty99CsI/anime-portal
                          ↑ capital I not lowercase l
Branch: main
```

---

## 3. DOCS FOLDER

### `/docs/HANDOFF.md`
```markdown
# HANDOFF — AniWatch-BJ88
Last updated: 2026-03-28

## Project in one sentence
Thai/Lao anime portal at anime.bj88la.net — indexes anime from 
anime-th.com, displays with luxury black/red/gold UI, monetized 
via AdSense banners.

## Live URLs
- Site: https://anime.bj88la.net
- Admin: https://anime.bj88la.net/admin.html (pw: bj88anime)
- GitHub: https://github.com/Kitty99CsI/anime-portal (capital I)
- Actions: https://github.com/Kitty99CsI/anime-portal/actions

## Current State (2026-03-28)
✅ Site live with Thai UI
✅ Cloudflare auto-deploys on every GitHub push
✅ Weekly scraper cron (Sunday 3am Bangkok)
✅ 9 ad slots managed via admin (no rebuild needed)
✅ AdSense submitted (pending approval)
✅ GA4 live
✅ Supabase DB live — 218 anime (growing)
✅ Banners save to Supabase (cross-device)

⚠️ 218/4359 anime scraped — run workflow daily to build library
⚠️ crawl_log RLS policy needs adding (one SQL line)

## Supabase
URL: https://pzrzdljwglybljthbffl.supabase.co
Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

## Design System
Luxury black/red/gold. Thai default.
Fonts: Cinzel, Sarabun, Share Tech Mono
--bg:#0c0c0c  --red:#c0392b  --gold:#d4a843  --text:#f8f5ee
```

---

### `/docs/STRUCTURE.md`
```markdown
# STRUCTURE — AniWatch-BJ88
Last updated: 2026-03-28

## File Structure
anime-portal/
├── index.html              ← Main site (SPA, ~2500 lines)
├── admin.html              ← Admin panel (pw: bj88anime)
├── policy.html             ← Privacy policy
├── .github/workflows/
│   └── weekly-sync.yml     ← Scraper cron (Sunday 3am Bangkok)
├── scripts/
│   ├── scraper.js          ← Scraper v4 (self-healing)
│   └── generate-sitemap.js
├── src/data/
│   ├── anime.json          ← Local backup (218 anime)
│   └── episodes.json
└── public/
    └── sitemap.xml         ← 820 URLs, auto-generated

## Data Flow
anime-th.com → scraper.js → Supabase DB
                          → anime.json (backup)
                          → sitemap.xml
Cloudflare serves index.html
index.html fetches from Supabase at runtime

## Ad Slots (9 total)
leaderboard-top    1280×220  max 10  full width top
leaderboard-footer 1280×220  max 10  full width bottom  
infeed             728×90    max 5   between rows
below-player ⭐    728×90    max 5   under player (high CPM)
watch-header       728×90    max 5   watch page top
sidebar-1          300×250   max 5   desktop only
sidebar-2          300×250   max 5   desktop only
watch-sidebar      300×600   max 5   desktop only
halfpage ⭐        300×600   max 5   desktop only (high CPM)

## Scraper v4 Logic
Each run (max 150 anime, ~20 min):
NEW   → never in DB → scrape and add
STALE → episode_count=0 OR genres=[] → re-scrape and fix  
GOOD  → complete data → skip (saves time, avoids ban)
```

---

### `/docs/CHANGELOG.md`
```markdown
# CHANGELOG — AniWatch-BJ88

## 2026-03-28

### Major — Supabase Integration (Phase 2)
- Banners now save to Supabase banners table (cross-device)
- index.html reads anime from Supabase with anime.json fallback
- admin.html reads/writes banners from Supabase
- Dashboard shows real counts from Supabase
- Scraper v4 writes directly to Supabase on each run
- crawl_log table tracks all scraper runs

### Fixed — Scraper v4
- Self-healing: NEW/STALE/GOOD classification
- Genres from JSON-LD schema (3 strategies)
- Episodes via HTML buttons + AJAX fallback
- Supabase upsert fixed (204 empty body parse error)
- Crawl log saved after each run

### Fixed — index.html
- Syntax error line 2167 (single quotes in string)
- Banner load fires independently before anime load
- Mobile banners: :has() replaced with JS class (iOS Safari fix)
- loadBanners() runs parallel to loadData()
- Full-width banner option (reverted to 1280px per team)
- Hero shows 2024+ airing anime preferentially
- Genre filter dropdown removed (simplification)
- "- Anime TH" stripped from titles in normalizeAnime()

### Fixed — admin.html  
- saveAllSlots() now actually saves to Supabase
- Dashboard loads counts from Supabase
- Mobile sitemap preview added
- Slot badges: green dot = active, grey = empty

## 2026-03-27
- Scraper v3: category pages (4359 slugs found)
- GitHub Actions permissions 403 fixed
- index.html: full Thai rebuild
- Admin panel: rebuilt from scratch
```

---

## For Facebook Auto-Posting Bot

**What data you'll use:**
```javascript
// Fetch new anime added today
const res = await fetch(
  `https://pzrzdljwglybljthbffl.supabase.co/rest/v1/anime` +
  `?site_id=eq.1&order=scraped_at.desc&limit=5&select=` +
  `title_th,title_en,cover_url,description,genres,` +
  `episode_count,status,year,slug`,
  { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }}
);
const anime = await res.json();

// Each anime has:
// title_th   → 'Violet Evergarden ไวโอเล็ต เอเวอร์การ์เดน'
// title_en   → 'Violet Evergarden'  
// cover_url  → 'https://image.tmdb.org/t/p/original/...'
// description→ Thai text, ~200 chars
// genres     → ['Drama', 'Fantasy']
// episode_count → 13
// status     → 'airing'
// slug       → 'violet-evergarden'
// watch URL  → `https://anime.bj88la.net/#${slug}`
```
