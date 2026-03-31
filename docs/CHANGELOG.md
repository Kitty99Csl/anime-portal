# CHANGELOG — AniWatch-BJ88

## 2026-03-30
### Changed
- Scraper cron: weekly → daily (0 20 * * *) to build library faster
  Revert to weekly (0 20 * * 0) when 4359 anime complete
- Banner: tested full-width option, reverted to max-width:1280px (team preference)
- Hero: now cycles 2024+ airing anime preferentially (better visuals)
- Genre filter: removed dropdown (simplification per owner)
- "- Anime TH" suffix: stripped in normalizeAnime() display layer
- Docs: full update to reflect current state

---

## 2026-03-28

### Major — Phase 2: Supabase Integration
- All anime data reads from Supabase first (anime.json fallback)
- Banners saved to Supabase banners table — cross-device, survives deploys
- Admin saves/loads banners from Supabase (not localStorage only)
- Dashboard shows real counts from Supabase
- Scraper writes to Supabase on every run
- crawl_log table tracks all scraper runs

### Fixed — Scraper v4
- Self-healing: NEW/STALE/GOOD classification — never need to clear JSON
- Genres: JSON-LD "genre" array, 3 fallback strategies
- Episodes: HTML buttons + AJAX fallback
- Supabase upsert: fixed 204 empty body parse error
- Timeout raised to 25min (commit had no time at 20min)
- Crawl log saved to Supabase after each run

### Fixed — index.html
- Syntax error line 2167 (single quotes inside single-quoted string)
- loadBanners() fires independently before loadData() — parallel load
- iOS Safari: :has() CSS removed, replaced with JS .ad-bar-active class
- Mobile: all banner CSS uses !important overrides for visibility
- Full-width banner (tested, reverted per team)
- Hero: 2024+ airing anime prioritised
- Genre dropdown removed
- "- Anime TH" stripped from title display

### Fixed — admin.html
- saveAllSlots() now saves to Supabase (was localStorage-only)
- Dashboard counts from Supabase
- Mobile sitemap preview added (shows iPhone layout)
- Slot badges: green dot = active, grey = empty — immediately clear
- initAdmin() async — loads Supabase banners on open

### Infrastructure
- Supabase schema: 6 tables (sites, anime, episodes, banners, admins, crawl_log)
- RLS policies: public read, anon write for scraper + admin
- docs/schema.sql added to repo

---

## 2026-03-27

### Fixed — Scraper v3
- Wrong URL: homepage pagination → 3 category archive pages
- Found 4359 total slugs (vs 62 before)
- MAX_PER_RUN = 150, timeout 25min

### Fixed — GitHub Actions
- 403: added `permissions: contents: write`
- Sitemap crash: `continue-on-error: true`
- Git conflict: `git pull --rebase`

### Fixed — index.html
- Full Thai UI (no Lao text)
- Redirect player (no broken iframe)
- Episode list from episode_count when episodes.json empty
- Card image fade-in bug fixed
- Status detection: airing / complete / upcoming

---

## 2026-03-26 (Session Start)
- Site live at anime.bj88la.net
- Cloudflare Workers hosting, GitHub auto-deploy
- BJ88 hexagon logo, luxury black/red/gold design
- 9 ad slots, admin panel (localStorage)
- GA4: G-D2H8CHS41Z, AdSense: pub-6565202571679235
- ads.txt authorized
- Scraper v1: wrong URL, only 62 anime

---

## 2026-03-31

### Added — Facebook Auto-Poster integration
- Make.com scenario live — posts 1 anime/day at 08:00 AM Bangkok
- Supabase column: `anime.fb_posted_at timestamptz` added
- Hash routing: `index.html` now handles `#slug` links from Facebook posts
  → detects `window.location.hash` on load → redirects to watch domain
- Scraper: TMDB images now strictly preferred over WordPress fallback URLs
- Docs updated with Facebook auto-poster section

### SQL run in Supabase
```sql
alter table anime add column if not exists fb_posted_at timestamptz default null;
create policy "anon insert crawl" on crawl_log for insert with check (true);
```

---

## 2026-03-31 (Final Session)

### Added — Watch Player (watch.b88l.net)
- `watch.html` — complete watch player page, separate domain
- Mobile: full-screen iframe `calc(100svh - 52px)` — shows full anime-th.com UI
- Desktop: player left + episode list right (340px sidebar)
- Episode navigation: `?ep=N` query param → anime-th.com loads correct episode
- Episode change: auto-loads player (no tap required)
- Banners: loads from Supabase same as main site
- Cloudflare Pages project: `watch-b88` → `watch.b88l.net`

### Fixed — index.html
- Duplicate `const btnWatch` declaration → crashed all JS → no anime showing
- Watch URL corrected: `watch.b88l.net/watch.html` (was missing `/watch.html`)
- Mobile: opens watch in same tab (`_self`) — Desktop: new tab (`_blank`)
- Hash routing: `#slug` → `watch.b88l.net/watch.html?slug=...`

### Added — Facebook Auto-Poster integration
- Make.com scenario live — 1 anime/day at 08:00 AM Bangkok
- `anime.fb_posted_at` column added to Supabase
- Gemini 2.5 Flash generates Lao captions
- Facebook page: AniWatch-BJ88 (ID: 61578401947046)

### Fixed — Scraper
- TMDB images strictly preferred over WordPress fallback URLs

### Updated — Docs
- HANDOFF.md: full rewrite with watch player, FB poster, all current state
- CHANGELOG.md: complete history
