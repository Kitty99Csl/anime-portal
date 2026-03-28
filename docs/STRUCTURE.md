# STRUCTURE — AniWatch-BJ88

Last updated: 2026-03-28

---

## Live URLs

| Purpose | URL |
|---------|-----|
| Main site | https://anime.bj88la.net |
| Admin panel | https://anime.bj88la.net/admin.html (pw: bj88anime) |
| Privacy policy | https://anime.bj88la.net/policy.html |
| Sitemap | https://anime.bj88la.net/public/sitemap.xml |
| ads.txt | https://bj88la.net/ads.txt ✅ |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | `index.html` — single file SPA | 2376 lines, self-contained |
| Hosting | Cloudflare Workers (static) | Auto-deploys on GitHub push |
| Domain | `anime.bj88la.net` → CNAME → `anime-portal.kitokvk.workers.dev` |
| Data | `src/data/anime.json` + `src/data/episodes.json` | Flat JSON files |
| Scraper | `scripts/scraper.js` v4 | Node 20, no dependencies |
| Automation | GitHub Actions `weekly-sync.yml` | Sunday 3am Bangkok |
| Sitemap | `scripts/generate-sitemap.js` | Auto-runs after scraper |
| Analytics | GA4 `G-D2H8CHS41Z` | |
| AdSense | `pub-6565202571679235` | Pending approval |

---

## File Structure

```
anime-portal/
├── index.html              ← Main site (SPA, 2376 lines)
├── admin.html              ← Admin panel (pw: bj88anime)
├── policy.html             ← Privacy policy (AdSense requirement)
├── .github/
│   └── workflows/
│       └── weekly-sync.yml ← Scraper cron + sitemap + commit
├── scripts/
│   ├── scraper.js          ← Scraper v4 (self-healing)
│   ├── generate-sitemap.js ← Generates public/sitemap.xml
│   └── package.json        ← Must have {"type":"module"}
├── src/
│   └── data/
│       ├── anime.json      ← Scraped anime data (150+ entries, growing)
│       └── episodes.json   ← Episode lists per anime
├── public/
│   └── sitemap.xml         ← Auto-generated, served by Cloudflare
└── docs/
    ├── CHANGELOG.md        ← This history
    ├── STRUCTURE.md        ← This file
    └── HANDOFF.md          ← Context for new Claude session
```

---

## Data Flow

```
anime-th.com (source site)
    │
    ▼ scraper.js reads 3 category pages:
    │   /category/ซับไทย/
    │   /category/พากย์ไทย/
    │   /category/อนิเมะจีนซับไทย/
    │
    ▼ For each anime detail page:
    │   - Title from og:title
    │   - Cover from TMDB or og:image
    │   - Episode count from JSON-LD "numberOfEpisodes"
    │   - Genres from JSON-LD "genre" array
    │   - Status from page text (จบแล้ว / เร็วๆ นี้ / airing)
    │   - Episodes from HTML buttons (data-episode-id)
    │
    ▼ Saved to GitHub:
    │   src/data/anime.json
    │   src/data/episodes.json
    │   public/sitemap.xml
    │
    ▼ Cloudflare auto-deploys
    │
    ▼ index.html fetches /src/data/anime.json at runtime
    │
    ▼ User sees real anime content
```

---

## Scraper v4 Logic

```
Each run (max 150 anime, ~12 min):

1. Scan all category pages → collect ALL slugs
2. Classify each slug:
   - NEW   → never in anime.json → scrape and add
   - STALE → episode_count=0 OR genres=[] OR no episodes → re-scrape and fix
   - GOOD  → complete data → skip (saves time, avoids ban)
3. Process [NEW + STALE] up to MAX_PER_RUN=150
4. Save with merge (never overwrites good data)
5. Checkpoint every 50 anime

Result: Runs weekly, self-heals, never needs manual JSON clearing
```

---

## Ad System

9 slots managed via admin panel at `/admin.html`:

| Slot ID | Position | Recommended Size | Max Banners |
|---------|----------|-----------------|-------------|
| `leaderboard-top` | Top of page | 1280×220 or 728×90 | 10 |
| `leaderboard-footer` | Bottom of page | 1280×220 or 728×90 | 10 |
| `infeed` | Between anime sections | 728×90 or 728×60 | 5 |
| `below-player` ⭐ | Under video player | 728×60 | 5 |
| `watch-header` | Top of watch page | 728×60 | 5 |
| `sidebar-1` | Sidebar top | 300×250 or 300×600 | 5 |
| `sidebar-2` | Sidebar bottom | 300×250 | 5 |
| `watch-sidebar` | Watch page sidebar | 300×250 or 300×600 | 5 |
| `halfpage` ⭐ | Half page unit | 300×600 | 5 |

**Any image size is supported** — images fill slot width, height auto-scales.
**Empty slots are invisible** — no placeholder boxes shown to visitors.
**Banner config stored in `localStorage('bj88_adslots')`** — live update, no rebuild.

---

## Design System

```css
--bg:       #0c0c0c    /* Page background */
--surface:  #161616    /* Header, cards */
--card:     #1e1e1e    /* Card background */
--border:   #484848    /* Borders */
--red:      #c0392b    /* Primary action color */
--red-h:    #e74c3c    /* Red hover */
--gold:     #d4a843    /* Accent color */
--gold-line:#8a7040    /* Gold border */
--text:     #f8f5ee    /* Primary text */
--text2:    #d9c49e    /* Secondary text */
--text3:    #b09870    /* Hint text */

Fonts:
  --f-display: 'Cinzel' (headings)
  --f-body:    'Sarabun' (body, Thai text)
  --f-mono:    'Share Tech Mono' (badges, labels)
```

---

## Phase Roadmap

### Phase 1 — CURRENT ($0/month)
- ✅ Site live, Cloudflare hosting
- ✅ Scraper v4, weekly auto-run
- ✅ 9 ad slots, admin panel
- ⏳ AdSense approval (1-2 weeks)
- 🔜 Sitemap → Google Search Console

### Phase 1.5 — After AdSense approval ($0)
- Paste AdSense auto-ads script in admin panel
- Submit sitemap to Google Search Console
- Revenue starts

### Phase 2 — If data needs manual editing (~month 2-3, $0)
- Supabase PostgreSQL replaces anime.json
- Admin content editor (fix titles, covers, links)
- Trigger: when scraper saves wrong data that needs human correction

### Phase 3+ — Not planned
---

## Key Credentials

```
GitHub:     Kitty99CsI/anime-portal  ← NOTE: capital I not lowercase l
Cloudflare: anime-portal.kitokvk.workers.dev
GA4:        G-D2H8CHS41Z
AdSense:    pub-6565202571679235
Admin PW:   bj88anime
```
