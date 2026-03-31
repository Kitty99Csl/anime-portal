# HANDOFF — AniWatch-BJ88
**Last updated:** 2026-03-31
**Paste this at the start of every new Claude session.**

---

## Project in one sentence
Thai anime portal at **anime.bj88la.net** — indexes 4359 anime from anime-th.com, luxury black/red/gold UI, monetized via AdSense + direct banners. Data in Supabase PostgreSQL. Watch player at **watch.b88l.net**.

---

## Live URLs
| Purpose | URL |
|---------|-----|
| Main site | https://anime.bj88la.net |
| Watch player | https://watch.b88l.net/watch.html?slug=SLUG&ep=N |
| Admin panel | https://anime.bj88la.net/admin.html (pw: `bj88anime`) |
| GitHub | https://github.com/Kitty99CsI/anime-portal ← capital I not lowercase l |
| Actions | https://github.com/Kitty99CsI/anime-portal/actions |
| Sitemap | https://anime.bj88la.net/public/sitemap.xml |

---

## Credentials
```
Supabase URL:  https://pzrzdljwglybljthbffl.supabase.co
Supabase anon: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cnpkbGp3Z2x5YmxqdGhiZmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzczNjUsImV4cCI6MjA5MDI1MzM2NX0.HzAKYcSQ_kjlKrf-HQSwVdwi_-J8aBnP6HinMDjfkTA
GA4:           G-D2H8CHS41Z
AdSense:       pub-6565202571679235 (pending approval)
Admin pw:      bj88anime
CF Worker:     anime-portal.kitokvk.workers.dev
```

---

## Current State (2026-03-31)

### ✅ Everything Working
- Main site live — Thai UI, cards, hero, search, filters, pagination
- Watch player live — watch.b88l.net (separate domain, separate CF project)
- iframe player loads anime-th.com — no redirect, plays on site
- Mobile: full-screen iframe, episode navigation via ?ep=N
- Desktop: player + episode list side by side
- Supabase DB: ~700+ anime growing daily
- Banners cross-device — Supabase → iOS/Android/PC all show
- Scraper v4 self-healing — daily cron 3am Bangkok
- Admin panel: dashboard, banner manager, desktop+mobile sitemap preview
- GA4 live, AdSense submitted
- Facebook auto-poster: 1 anime/day at 08:00 AM Bangkok (Make.com)
- Hash routing: anime.bj88la.net/#slug → watch player ✅
- TMDB image preference in scraper ✅

### ⚠️ Pending
1. **Supabase SQL** — run if not done:
   ```sql
   create policy "anon insert crawl" on crawl_log for insert with check (true);
   ```
2. **Google Search Console** — submit sitemap
3. **Scraper** — runs daily auto, ~20 more runs to reach 4359 anime
4. **AdSense** — paste auto-ads when approved (passive wait)
5. **Cron** — change back to weekly (`0 20 * * 0`) when library complete

---

## Tech Stack
```
Frontend:     index.html — single-file SPA, vanilla JS, ~2535 lines
Watch player: watch.html — separate file, served from watch.b88l.net
Hosting:      Cloudflare Workers/Pages — auto-deploy from GitHub
Database:     Supabase PostgreSQL (free tier)
Images:       TMDB CDN hotlink — no file storage needed
Banners:      External URLs stored in Supabase banners table
Scraper:      Node.js 20, GitHub Actions daily cron
FB Poster:    Make.com (separate, not in this repo)
```

---

## File Structure
```
anime-portal/
├── index.html                  ← Main site SPA
├── watch.html                  ← Watch player (served at watch.b88l.net)
├── admin.html                  ← Admin panel
├── policy.html                 ← Privacy policy
├── .github/workflows/
│   └── weekly-sync.yml         ← Daily cron (change to weekly when done)
├── scripts/
│   ├── scraper.js              ← v4 self-healing, Supabase + JSON backup
│   └── generate-sitemap.js
├── src/data/
│   ├── anime.json              ← Local backup
│   └── episodes.json
├── public/
│   └── sitemap.xml
└── docs/
    ├── HANDOFF.md              ← This file
    ├── STRUCTURE.md
    ├── CHANGELOG.md
    └── schema.sql
```

---

## Cloudflare Projects
```
Project 1: anime-portal  → anime.bj88la.net  (main site + admin)
Project 2: watch-b88     → watch.b88l.net    (watch.html player only)
Both: same GitHub repo Kitty99CsI/anime-portal, auto-deploy on push
```

---

## Supabase Tables
```
sites       → id, domain, name
anime       → id, site_id, slug, title_th, title_en, cover_url,
              description, genres[], year, status, episode_count,
              post_id, season_id, source_url, scraped_at, fb_posted_at
episodes    → id, anime_id, number, title, has_sub, has_dub
banners     → id, site_id, slot_id, img_url, click_url, html_code, type, enabled, sort_order
admins      → id, site_id, username, password, role
crawl_log   → id, site_id, run_at, added, fixed, total, duration_s, status
```
⚠️ DO NOT remove `anime.fb_posted_at` — used by Facebook auto-poster

---

## Scraper v4
```
Each run: max 150 anime, ~20 min
NEW   → never in Supabase → scrape + insert
STALE → episode_count=0 OR genres=[] → re-scrape + update
GOOD  → complete data → skip

Writes: Supabase (primary) + anime.json (backup)
Cover:  Always prefers TMDB CDN over WordPress fallback
Cron:   daily 3am Bangkok (0 20 * * *) — revert to weekly when done
```

---

## Watch Player (watch.b88l.net)
```
URL format:  watch.b88l.net/watch.html?slug=SLUG&ep=N
Source:      iframe → anime-th.com/anime/SLUG/?ep=N
Mobile:      full-screen iframe (calc(100svh - 52px))
Desktop:     player left + episode list right (340px)
Episodes:    from Supabase, fallback generated from episode_count
Banners:     loads leaderboard-top + leaderboard-footer from Supabase
```

---

## Facebook Auto-Poster (Make.com)
```
Status:  LIVE — posts 1 anime/day at 08:00 AM Bangkok
Flow:    Schedule → Supabase GET → Gemini caption → Facebook POST → PATCH fb_posted_at
AI:      Gemini 2.5 Flash (Google AI Studio)
Page:    AniWatch-BJ88 (ID: 61578401947046)
Links:   anime.bj88la.net/#slug → auto-redirects to watch.b88l.net
```

---

## Ad Slots (9 total)
```
leaderboard-top/footer   1280×220  max 10  mobile ✅
infeed, below-player ⭐  728×90    max 5   mobile ✅
watch-header             728×90    max 5   mobile ✅
sidebar-1/2, halfpage ⭐ 300×250+  max 5   desktop only ❌
watch player also shows: leaderboard-top + leaderboard-footer from Supabase
```

---

## Known Gotchas
```
1. GitHub: Kitty99CsI — capital I not lowercase l (403 if wrong)
2. Cloudflare cache: trigger deploy manually if site not updating
3. Cron: revert to weekly (0 20 * * 0) when 4359 anime complete
4. watch.b88l.net needs separate Cloudflare Pages project (watch-b88)
5. anime-th.com episode URL: /anime/slug/?ep=N — if not working try /anime/slug/ep-N/
```

---

## How to Start a New Session
```
"Continuing AniWatch-BJ88. Today I want to: [task]"
+ attach this HANDOFF.md
```

---

## Session History
| Date | Key Work |
|------|----------|
| 2026-03-26 | Initial setup, site live, scraper v1 |
| 2026-03-27 | Scraper v3 (4359 slugs), GitHub Actions fixed |
| 2026-03-28 | Scraper v4 + Supabase Phase 2, index.html rebuilt, banners cross-device |
| 2026-03-30 | Daily cron, docs, Facebook bot scoped separately |
| 2026-03-31 | Watch player (watch.b88l.net), hash routing, FB auto-poster live, TMDB fix |
