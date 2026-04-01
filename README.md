# 🎌 AniWatch-BJ88 

> ดูอนิเมะออนไลน์ ซับไทย พากย์ไทย อัปเดตทุกสัปดาห์

**Live site:** https://anime.bj88la.net | **Watch player:** https://watch.b88l.net

---

## Overview

AniWatch-BJ88 is a Thai/Lao anime portal that indexes anime from anime-th.com and presents them in a luxury black/red/gold UI. Content updates automatically every day via GitHub Actions. Watch player hosted separately at watch.b88l.net.

- 🎬 **4,359 anime** indexed from Thai sources (growing daily)
- 📺 **Watch player** — iframe embed at watch.b88l.net, mobile optimised
- 📱 **Mobile-first** — optimized for Safari and Chrome on iOS/Android
- 💰 **AdSense monetized** — 9 ad slots managed via admin panel (Supabase-backed)
- 🔄 **Auto-updating** — daily scraper runs without manual intervention
- 🌐 **Thai default** — language switcher (ລາວ / ไทย / EN)
- 🤖 **Facebook auto-poster** — daily Lao posts via Make.com + Gemini AI

**Monthly cost: $0**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Single `index.html` — self-contained SPA |
| Watch player | `watch.html` — served at `watch.b88l.net` |
| Hosting | Cloudflare Workers/Pages (static) |
| Domain | `anime.bj88la.net` + `watch.b88l.net` → Cloudflare |
| Database | Supabase PostgreSQL — anime, episodes, banners |
| Scraper | `scripts/scraper.js` — Node 20, no dependencies |
| Automation | GitHub Actions — `weekly-sync.yml` (daily cron) |
| Analytics | GA4 `G-D2H8CHS41Z` |
| AdSense | `pub-6565202571679235` |
| FB Poster | Make.com + Gemini 2.5 Flash (separate from this repo) |

---

## File Structure

```
anime-portal/
├── index.html              ← Main site (SPA, self-contained)
├── watch.html              ← Watch player (served at watch.b88l.net)
├── admin.html              ← Admin panel (password protected)
├── policy.html             ← Privacy policy
├── .github/
│   └── workflows/
│       └── weekly-sync.yml ← Daily scraper + sitemap + deploy
│                              Change cron to weekly (0 20 * * 0) when 4359 done
├── scripts/
│   ├── scraper.js          ← Scraper v4 (self-healing, writes to Supabase)
│   ├── generate-sitemap.js ← Generates sitemap.xml
│   └── package.json        ← {"type":"module"} required
├── src/
│   └── data/
│       ├── anime.json      ← Local backup of Supabase data
│       └── episodes.json   ← Episode lists backup
├── public/
│   └── sitemap.xml         ← Auto-generated
└── docs/
    ├── HANDOFF.md          ← Context for new dev/AI session
    ├── STRUCTURE.md        ← Full architecture reference
    ├── CHANGELOG.md        ← Change history
    └── schema.sql          ← Supabase table definitions
```

---

## How It Works

```
anime-th.com ──scraper──▶ Supabase DB (primary)
                        ▶ anime.json + episodes.json (backup)
                                   │
                          GitHub commit
                                   │
                      Cloudflare auto-deploy
                                   │
              anime.bj88la.net (listing) ←→ watch.b88l.net (player)
```

### Scraper Logic (v4)
Each daily run classifies every anime slug:
- **NEW** → never scraped → scrape and add
- **STALE** → missing episode count / genres / episodes → re-scrape and fix
- **GOOD** → complete data → skip (saves time, avoids rate limiting)

Max 150 anime per run (~20 min). Self-healing — **never need to manually clear JSON files.**
Writes to Supabase first, falls back to local JSON if Supabase fails.

---

## Watch Player (watch.b88l.net)

Separate Cloudflare Pages project (`watch-b88`) serving `watch.html` from same repo.

```
URL format:  watch.b88l.net/watch.html?slug=SLUG&ep=N
Source:      iframe → anime-th.com/anime/SLUG/?ep=N
Mobile:      full-screen iframe (calc(100svh - 52px))
Desktop:     player left + episode list right
Banners:     loads from Supabase (same config as main site)
```

---

## Admin Panel

URL: `https://anime.bj88la.net/admin.html` (pw: in docs/HANDOFF.md)

Features:
- **Dashboard** — live counts from Supabase (anime, episodes, slots, banners)
- **Site Map Preview** — visual overview of all 9 ad zones, desktop + mobile layout
- **Banner Manager** — upload banners per slot, saves to Supabase (cross-device)
- **Scraper status** — links to GitHub Actions, last run history
- **Settings** — site info, GA4 ID

Ad config stored in **Supabase** — shows on all devices instantly, survives every deploy.

---

## Supabase Database

| Table | Purpose |
|-------|---------|
| `sites` | Multi-site support (site_id=1 = anime.bj88la.net) |
| `anime` | All anime data including `fb_posted_at` for FB poster |
| `episodes` | Episode lists per anime |
| `banners` | Ad slot config — cross-device, survives deploys |
| `admins` | Admin accounts per site |
| `crawl_log` | Scraper run history |

⚠️ Do NOT remove `anime.fb_posted_at` — used by Facebook auto-poster.

---

## Ad Slots

| Slot | Position | Recommended Size | Mobile |
|------|----------|-----------------|--------|
| Leaderboard Top | Top of page | 1280×220 or 728×90 | ✅ |
| Footer Leaderboard | Bottom of page | 1280×220 or 728×90 | ✅ |
| In-Feed | Between sections | 728×90 or 728×60 | ✅ |
| Below Player ⭐ | Under video player | 728×60 | ✅ |
| Watch Header | Watch page top | 728×60 | ✅ |
| Sidebar Top | Right sidebar | 300×250 | ❌ desktop only |
| Sidebar Bottom | Right sidebar | 300×250 | ❌ desktop only |
| Watch Sidebar | Watch page sidebar | 300×250 or 300×600 | ❌ desktop only |
| Half Page ⭐ | Sidebar tall unit | 300×600 | ❌ desktop only |

⭐ = highest CPM positions

---

## Facebook Auto-Poster

Managed in Make.com — separate from this repo.

- Posts 1 anime/day at 08:00 AM Bangkok time
- AI: Gemini 2.5 Flash — writes natural Lao captions
- Links: `anime.bj88la.net/#slug` → auto-redirects to `watch.b88l.net`
- Tracks posted anime via `anime.fb_posted_at` column in Supabase

---

## Design System

**Theme:** Luxury black / red / gold

```
Background:  #0c0c0c
Surface:     #161616
Red:         #c0392b
Gold:        #d4a843
Text:        #f8f5ee

Fonts:
  Cinzel          — display headings
  Sarabun         — body text (Thai optimized)
  Share Tech Mono — labels, badges, mono
```

---

## Development

### Running the scraper manually
```bash
cd scripts
node scraper.js
```

### Generating sitemap
```bash
node scripts/generate-sitemap.js
```

### Deploying
Push to `main` → Cloudflare auto-deploys within ~1 min (both projects).

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Complete | Site live, scraper running |
| 1.5 | ⏳ Waiting | AdSense approval → revenue starts |
| 2 | ✅ Complete | Supabase DB, banners cross-device |
| Watch | ✅ Complete | watch.b88l.net iframe player |
| FB Bot | ✅ Complete | Daily Facebook auto-poster |

---

## Important Notes

- **GitHub username** is `Kitty99CsI` — last character is capital **I** not lowercase **l**. They look identical in most fonts. Wrong URL = 403.
- **`package.json`** in `/scripts/` must contain `{"type":"module"}` for ES module imports.
- **Ad banners** update live via admin panel → Supabase → all devices instantly.
- **anime.json** is a backup — primary data source is now Supabase.
- **Cron** is currently daily (`0 20 * * *`) — revert to weekly (`0 20 * * 0`) in `weekly-sync.yml` when all 4359 anime are scraped.
- **watch.b88l.net** needs its own Cloudflare Pages project (`watch-b88`) pointing to same repo.

---

## Links

- 🌐 [Live Site](https://anime.bj88la.net)
- 📺 [Watch Player](https://watch.b88l.net)
- ⚙️ [Admin Panel](https://anime.bj88la.net/admin.html)
- 📋 [GitHub Actions](https://github.com/Kitty99CsI/anime-portal/actions)
- 📊 [GA4 Analytics](https://analytics.google.com)
- ☁️ [Cloudflare Dashboard](https://dash.cloudflare.com)
- 💰 [AdSense](https://www.google.com/adsense)
- 🗄️ [Supabase Dashboard](https://supabase.com/dashboard/project/pzrzdljwglybljthbffl)

---

*© 2026 ANIWATCH-BJ88 · anime.bj88la.net*
