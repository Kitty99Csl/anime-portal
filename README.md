# 🎌 AniWatch-BJ88

> ดูอนิเมะออนไลน์ ซับไทย พากย์ไทย อัปเดตทุกสัปดาห์

**Live site:** https://anime.bj88la.net

---

## Overview

AniWatch-BJ88 is a Thai/Lao anime portal that indexes anime from anime-th.com and presents them in a luxury black/red/gold UI. Content updates automatically every week via GitHub Actions.

- 🎬 **4,000+ anime** indexed from Thai sources
- 📱 **Mobile-first** — optimized for Safari and Chrome on iOS/Android
- 💰 **AdSense monetized** — 9 ad slots managed via admin panel
- 🔄 **Auto-updating** — weekly scraper runs without manual intervention
- 🌐 **Thai default** — language switcher (ลาว / ไทย / EN)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Single `index.html` — self-contained SPA |
| Hosting | Cloudflare Workers (static) |
| Domain | `anime.bj88la.net` → Cloudflare |
| Data | `src/data/anime.json` + `src/data/episodes.json` |
| Scraper | `scripts/scraper.js` — Node 20, no dependencies |
| Automation | GitHub Actions — `weekly-sync.yml` |
| Analytics | GA4 `G-D2H8CHS41Z` |
| AdSense | `pub-6565202571679235` |

---

## File Structure

```
anime-portal/
├── index.html              ← Main site (SPA, self-contained)
├── admin.html              ← Admin panel (password protected)
├── policy.html             ← Privacy policy
├── .github/
│   └── workflows/
│       └── weekly-sync.yml ← Auto scraper + sitemap + deploy
├── scripts/
│   ├── scraper.js          ← Scraper v4 (self-healing)
│   ├── generate-sitemap.js ← Generates sitemap.xml
│   └── package.json        ← {"type":"module"} required
├── src/
│   └── data/
│       ├── anime.json      ← Scraped anime data
│       └── episodes.json   ← Episode lists
├── public/
│   └── sitemap.xml         ← Auto-generated
└── docs/
    ├── HANDOFF.md          ← Context for new dev/AI session
    ├── STRUCTURE.md        ← Full architecture reference
    └── CHANGELOG.md        ← Change history
```

---

## How It Works

```
anime-th.com ──scraper──▶ anime.json + episodes.json
                                   │
                          GitHub commit
                                   │
                      Cloudflare auto-deploy
                                   │
                    anime.bj88la.net (live)
```

### Scraper Logic (v4)
Each weekly run classifies every anime slug:
- **NEW** → never scraped → scrape and add
- **STALE** → missing episode count / genres / episodes → re-scrape and fix
- **GOOD** → complete data → skip (saves time, avoids rate limiting)

Max 150 anime per run (~12 min). Self-healing — **never need to manually clear JSON files.**

---

## Admin Panel

URL: `https://anime.bj88la.net/admin.html`

Features:
- **Dashboard** — live anime count, episode total, slot status
- **Site Map Preview** — visual overview of all 9 ad zones (clickable)
- **Banner Manager** — upload banners per slot, any image size supported
- **Scraper status** — links to GitHub Actions
- **Settings** — site info, GA4 ID

Ad config stored in `localStorage` — changes apply instantly without rebuild.

---

## Ad Slots

| Slot | Position | Recommended Size |
|------|----------|-----------------|
| Leaderboard Top | Top of page | 1280×220 or 728×90 |
| Footer Leaderboard | Bottom of page | 1280×220 or 728×90 |
| In-Feed | Between sections | 728×60 |
| Below Player ⭐ | Under video player | 728×60 |
| Watch Header | Watch page top | 728×60 |
| Sidebar Top | Right sidebar | 300×250 |
| Sidebar Bottom | Right sidebar | 300×250 |
| Watch Sidebar | Watch page sidebar | 300×250 |
| Half Page ⭐ | Sidebar tall unit | 300×600 |

⭐ = highest CPM positions

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
Push to `main` → Cloudflare auto-deploys within ~1 min.

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | 🔄 Active | Site live, scraper running, AdSense pending |
| 1.5 | ⏳ Waiting | AdSense approval → revenue starts |
| 2 | 🔜 Planned | Supabase DB for manual data editing |

---

## Important Notes

- **GitHub username** is `Kitty99CsI` — last character is capital **I** not lowercase **l**. They look identical in most fonts. Wrong URL = 403.
- **`package.json`** in `/scripts/` must contain `{"type":"module"}` for ES module imports.
- **Ad banners** update live via admin panel — no GitHub push or Cloudflare rebuild needed.
- **anime.json** is self-healing — scraper v4 fixes bad data automatically each run.

---

## Links

- 🌐 [Live Site](https://anime.bj88la.net)
- ⚙️ [Admin Panel](https://anime.bj88la.net/admin.html)
- 📋 [GitHub Actions](https://github.com/Kitty99CsI/anime-portal/actions)
- 📊 [GA4 Analytics](https://analytics.google.com)
- ☁️ [Cloudflare Dashboard](https://dash.cloudflare.com)
- 💰 [AdSense](https://www.google.com/adsense)

---

*© 2026 ANIWATCH-BJ88 · anime.bj88la.net*
