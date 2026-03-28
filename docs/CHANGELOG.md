# CHANGELOG — AniWatch-BJ88

All notable changes to this project. Format: `## YYYY-MM-DD` → sections: Added / Fixed / Changed / Deployed

---

## 2026-03-28

### Fixed — Scraper v4 (FINAL)
- **Self-healing logic**: classifies slugs as NEW / STALE / GOOD each run
  - NEW = never scraped → add
  - STALE = episode_count=0 OR genres=[] OR episodes=[] → re-scrape and fix
  - GOOD = complete data → skip entirely (saves time, avoids ban)
- **Episode count**: now reads from JSON-LD `"numberOfEpisodes"` field (reliable)
- **Episode list**: reads HTML buttons `data-episode-id` directly (no AJAX needed)
- **Genres**: now reads from JSON-LD `"genre"` array, filters out sub/dub labels
- **Season ID**: fixed regex to find `<option value="XXXXX">Season` pattern
- **No manual clear needed**: merge logic updates existing, adds new — JSON files self-heal
- **AJAX fallback**: if HTML has no episode buttons, falls back to `get_episode_list` AJAX
- Checkpoint save every 50 anime (safe from timeout)
- Logs show `[NEW]` or `[FIX]` per anime for clarity

### Fixed — index.html (Production)
- Thai UI throughout — no Lao text in visible components
- Hero: poster zone covers full area (`inset:0`), fallback emoji hidden
- Hero: smooth image transition on slide change
- Hero: title scales with viewport `clamp(1.6rem, 2.8vw, 2.6rem)`
- Hero: responsive height `clamp(420px, 58vh, 680px)`
- Banners: flexible sizing — any image ratio works, fills slot width
- Banners: empty slots invisible (no dashed placeholder boxes in production)
- Banners: leaderboard/footer up to 1280px wide (supports your 1280×220 format)
- Mobile header: logo left, lang switcher center-right, hamburger right — no overlap
- Mobile nav: full-screen drawer with search bar inside, closes to ✕ icon
- Mobile ads: full width, no scroll, proportional scaling
- Text contrast: all levels lifted (`--text`, `--text2`, `--text3`)
- Card titles: brighter, text shadow for readability
- `- Anime TH` stripped from titles automatically
- HTML entities decoded in descriptions (`&hellip;` → `…` etc)
- Hero cycles real airing anime (not hardcoded [0,1,2,3])
- Genre/year filters auto-populate from actual scraped data
- ซับไทย/พากย์ไทย tabs actually filter episodes
- Recent widget sorted by `scraped_at` (newest first)
- Player: clean black redirect player — no iframe embed attempt
- `switchLang` actually filters episodes by sub/dub
- Loading text Thai (`กำลังโหลด...`)
- Last Lao string fixed: `↗ ຕົ້ນສະບັບ` → `↗ ต้นฉบับ`

### Fixed — admin.html (Full Rebuild)
- Dashboard: reads real anime count from `/src/data/anime.json` live
- Thai language throughout — no Lao text
- Ad slot manager: supports any banner size (flexible, not fixed px)
- Ad slot manager: live image preview when URL entered
- Ad slot manager: enable/disable toggle per slot
- Ad slot manager: shows recommended sizes (1280×220 or 728×90 etc)
- New section: **Site Map Preview** — visual mini browser showing all 9 ad zones
  - Clickable zones jump directly to that slot's editor
  - Green = has banner, grey = empty, gold = high CPM slot
- Slot status table on dashboard — all 9 slots at a glance
- All text colors brightened — fully readable on dark background
- Crawl section: updated pipeline description matches actual scraper v4

### Fixed — weekly-sync.yml
- `permissions: contents: write` — fixes 403 push error
- `mkdir -p public` before sitemap generation — fixes missing folder crash
- `continue-on-error: true` on sitemap step — commit never blocked by sitemap failure
- `git pull --rebase` before push — fixes git conflict when files edited manually
- Timeout: 20 min (matches 150 anime × ~4s per anime)

### Infrastructure
- Cloudflare auto-deploy connected directly to GitHub (no deployment.yml needed)
- Removed `wrangler.toml`, `src/worker.js`, `deployment.yml` — not needed for static deploy
- `generate-sitemap.js` added to `scripts/` — generates `public/sitemap.xml` after each run
- sitemap auto-generated on each scraper run via weekly-sync.yml

---

## 2026-03-27

### Fixed — Scraper v3
- Wrong scraper URL: was paginating `/page/N/` (homepage, only 62 anime)
- Fixed to scrape 3 category archives: ซับไทย / พากย์ไทย / อนิเมะจีนซับไทย
- Found 4359 total slugs (vs 62 before)
- MAX_PER_RUN = 150 to avoid GitHub Actions timeout
- Incremental: skips slugs already in anime.json

### Fixed — GitHub Actions
- 403 permission error: added `permissions: contents: write`
- Sitemap crash: added `continue-on-error: true`
- Git push conflict: added `git pull --rebase`
- Timeout: raised from 90min to 20min (matched to 150 anime cap)

### Fixed — index.html
- All Lao text replaced with Thai
- Language switcher: Thai default, localStorage saved preference
- Status detection: `airing` / `complete` / `upcoming`
- Card image fade-in: fixed duplicate `style=` attribute bug
- Redirect player: clean black screen with play button (no broken iframe)
- Episode list: generates from `episode_count` when `episodes.json` empty
- Complete section uncapped (was hardcoded to 6)
- Removed DEMO text and PHASE 1 staging text

---

## 2026-03-26 (Session Start)

### Infrastructure — Initial State
- Site live at anime.bj88la.net
- Cloudflare Workers hosting
- BJ88 hexagon SVG logo + luxury black/red/gold design
- 9 ad slots (admin-managed via localStorage)
- GA4: G-D2H8CHS41Z
- AdSense: pub-6565202571679235 (submitted, pending approval)
- ads.txt: authorized ✅
- Weekly scraper (Sunday 3am Bangkok) — was scraping wrong URL
- anime.json: 62 entries (all from homepage pagination)
