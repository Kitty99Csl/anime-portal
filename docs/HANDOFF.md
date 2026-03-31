# HANDOFF — AniWatch-BJ88
**Last updated:** 2026-03-30
**Paste this at the start of every new Claude session.**

---

## Project in one sentence
Thai anime portal at **anime.bj88la.net** — indexes 4359 anime from anime-th.com, luxury black/red/gold UI, monetized via AdSense + direct banners. Data in Supabase PostgreSQL.

---

## Live URLs
| Purpose | URL |
|---------|-----|
| Main site | https://anime.bj88la.net |
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

## Current State (2026-03-30)

### ✅ Working
- Site live — Thai UI, cards, hero, search, filters, pagination
- Cloudflare auto-deploys on every GitHub push
- Supabase DB: 218 anime (growing daily via scraper)
- Banners cross-device — saved in Supabase, show on iOS/Android/PC
- Scraper v4 self-healing — NEW/STALE/GOOD classification
- Daily cron: 3am Bangkok (until 4359 anime complete)
- Admin panel: dashboard, banner manager, site map preview (desktop + mobile)
- GA4 live, AdSense submitted

### ⚠️ Pending (needs action)
1. **Supabase SQL** — run once in SQL Editor:
   `create policy "anon insert crawl" on crawl_log for insert with check (true);`
2. **Google Search Console** — submit `https://anime.bj88la.net/public/sitemap.xml`
3. **Scraper** — runs daily auto, ~27 more runs to reach 4359 anime
4. **Cron** — change back to weekly (`0 20 * * 0`) when library complete
5. **AdSense** — paste auto-ads when approved (passive wait)

### 📊 Numbers
```
Anime in Supabase:  218 / 4359
Monthly cost:       $0
Revenue:            $0 (AdSense pending)
```

---

## Tech Stack
```
Frontend:  index.html — single-file SPA, vanilla JS, no framework, ~2500 lines
Hosting:   Cloudflare Workers (static) — auto-deploy from GitHub push
Database:  Supabase PostgreSQL (free tier, 500MB limit)
Images:    TMDB CDN (cover_url hotlink) — no file storage needed
Banners:   External image URLs stored in Supabase banners table
Scraper:   Node.js 20, no dependencies, GitHub Actions cron
```

---

## File Structure
```
anime-portal/
├── index.html                  ← Main site SPA
├── admin.html                  ← Admin panel
├── policy.html                 ← Privacy policy
├── .github/workflows/
│   └── weekly-sync.yml         ← Daily cron (3am BKK) — change to weekly when done
├── scripts/
│   ├── scraper.js              ← v4 self-healing, writes to Supabase + JSON backup
│   └── generate-sitemap.js
├── src/data/
│   ├── anime.json              ← Local backup
│   └── episodes.json           ← Local backup
├── public/
│   └── sitemap.xml             ← Auto-generated each scraper run
└── docs/
    ├── HANDOFF.md              ← This file
    ├── STRUCTURE.md            ← Architecture reference
    ├── CHANGELOG.md            ← Full change history
    └── schema.sql              ← Supabase table definitions
```

---

## Supabase Tables
```
sites       → id, domain, name, active
anime       → id, site_id, slug, title_th, title_en, cover_url,
              description, genres[], year, status, episode_count,
              post_id, season_id, source_url, scraped_at
episodes    → id, anime_id, number, title, has_sub, has_dub
banners     → id, site_id, slot_id, img_url, click_url, html_code, type, enabled, sort_order
admins      → id, site_id, username, password, role
crawl_log   → id, site_id, run_at, added, fixed, total, duration_s, status
```
Full schema: `docs/schema.sql`

---

## Scraper v4
```
Each run: max 150 anime, ~20 min
NEW   → never in Supabase → scrape + insert
STALE → episode_count=0 OR genres=[] → re-scrape + update
GOOD  → complete data → skip

To run: GitHub → Actions → Weekly Data Sync → Run workflow
```

---

## Ad Slots (9 total)
```
leaderboard-top/footer   1280×220  max 10  mobile ✅
infeed, below-player ⭐  728×90    max 5   mobile ✅
watch-header             728×90    max 5   mobile ✅
sidebar-1/2, halfpage ⭐ 300×250+  max 5   desktop only ❌
```
Banners in Supabase → cross-device, survives every deploy.

---

## Design System
```
Fonts:   Cinzel (display), Sarabun (Thai body), Share Tech Mono
Colors:  --bg:#0c0c0c  --surface:#161616  --red:#c0392b
         --gold:#d4a843  --text:#f8f5ee
```

---

## Known Gotchas
```
1. GitHub: Kitty99CsI — last char capital I, not lowercase l (403 if wrong)
2. Cloudflare cache: Trigger deploy manually if site not updating
3. Cron: currently daily — revert to weekly (0 20 * * 0) when 4359 anime done
4. crawl_log RLS: needs INSERT policy (see Pending above)
```

---

## How to Start a New Session
Paste this file + say:
```
"Continuing AniWatch-BJ88. Today I want to: [task]"
```

---

## Session History
| Date | Key Work |
|------|----------|
| 2026-03-26 | Initial setup, site live, scraper v1 |
| 2026-03-27 | Scraper v3 (4359 slugs), GitHub Actions fixed |
| 2026-03-28 | Scraper v4 + Supabase, index.html rebuilt, admin rebuilt, banners cross-device |
| 2026-03-30 | Daily cron, docs updated, Facebook bot scoped as separate project |

---

## Facebook Auto-Poster (Make.com)

```
Status:       LIVE as of March 2026
Posts:        1 anime/day at 08:00 AM Bangkok (Make.com cron)
Managed in:   Make.com — separate from this repo
DB column:    anime.fb_posted_at (timestamptz) — DO NOT REMOVE
Facebook page: AniWatch-BJ88 (Page ID: 61578401947046)
AI model:     Gemini 2.5 Flash (Google AI Studio)
```

Flow: Schedule → Supabase GET (fb_posted_at=is.null) → Gemini caption → Facebook POST → Supabase PATCH (fb_posted_at=now)

**Fixes already applied:**
- Hash routing: `anime.bj88la.net/#violet-evergarden` → opens correct anime watch page ✅
- TMDB image preference: scraper always picks TMDB over WordPress fallback ✅
