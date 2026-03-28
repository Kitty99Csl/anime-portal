# HANDOFF — AniWatch-BJ88
**Last updated:** 2026-03-28
**Paste this at the start of every new Claude session.**

---

## Project in one sentence
Thai/Lao anime portal at **anime.bj88la.net** — indexes anime from anime-th.com, displays with luxury black/red/gold UI, monetized via AdSense banners.

---

## Live URLs
- Site: https://anime.bj88la.net
- Admin: https://anime.bj88la.net/admin.html (pw: `bj88anime`)
- GitHub: https://github.com/Kitty99CsI/anime-portal ← **capital I, not lowercase l**
- Actions: https://github.com/Kitty99CsI/anime-portal/actions

---

## Current State (as of 2026-03-28)

### ✅ Working
- Site live with Thai UI
- Cloudflare auto-deploys on every GitHub push
- Weekly scraper cron (Sunday 3am Bangkok)
- 9 ad slots managed via admin (no rebuild needed)
- AdSense submitted (pending approval)
- GA4 live

### ⚠️ In Progress
- 150 anime in database but `episode_count: 0` and `genres: []`
- Scraper v4 deployed — run workflow once to fix all stale data
- After scraper runs: all 150 anime get correct episodes + genres

### 🔜 Next Actions
1. GitHub Actions → Weekly Data Sync → **Run workflow**
2. Wait ~12 min → check site shows episode counts
3. Run 2-3 more times over coming days to build library
4. When AdSense approved → paste auto-ads in admin panel
5. Submit `sitemap.xml` to Google Search Console

---

## File Structure
```
anime-portal/
├── index.html              ← Main site (SPA)
├── admin.html              ← Admin panel
├── policy.html             ← Privacy policy
├── .github/workflows/
│   └── weekly-sync.yml     ← Scraper cron
├── scripts/
│   ├── scraper.js          ← Scraper v4 (self-healing)
│   └── generate-sitemap.js
├── src/data/
│   ├── anime.json          ← 150 anime (growing weekly)
│   └── episodes.json       ← Episode data
└── public/
    └── sitemap.xml
```

---

## Scraper v4 — How it works
**Never need to clear anime.json manually.** Each run:
- Scans all 3 category pages on anime-th.com (~5 min)
- Classifies: NEW (never seen) / STALE (bad data) / GOOD (skip)
- Processes max 150 per run → ~12 min
- Self-heals bad data automatically
- Weekly cron adds ~150 new anime per week

**To run manually:**
GitHub → Actions → Weekly Data Sync → Run workflow

---

## Ad System
- 9 slots configured in admin panel
- Config stored in browser `localStorage('bj88_adslots')`
- Upload banner URL → enable slot → saves instantly, no rebuild
- Supports any image size (1280×220, 728×90, 300×250 etc)
- Empty slots are invisible to visitors

---

## Design System
Luxury black/red/gold. Thai default language.
- Fonts: Cinzel (display), Sarabun (body), Share Tech Mono (mono)
- Colors: `--bg:#0c0c0c` `--red:#c0392b` `--gold:#d4a843` `--text:#f8f5ee`

---

## Known Issues / Watch Out
1. **GitHub username**: `Kitty99CsI` — the last 3 chars are `C`, `s`, `I` (capital I).
   In most fonts `I` and `l` look identical. Wrong URL = 403.
2. **Cloudflare cache**: after GitHub push, Cloudflare may serve old version for a few
   minutes. If site doesn't update, go to Cloudflare → Workers & Pages → Trigger deploy.
3. **scraper.js episode_count=0**: fixed in v4 — reads JSON-LD `"numberOfEpisodes"`.
   Old data in anime.json will be auto-fixed on next scraper run.
4. **genres=[]**: fixed in v4 — reads JSON-LD `"genre"` array.
5. **`- Anime TH` in titles**: stripped automatically by `normalizeAnime()` in index.html.
6. **HTML entities in desc**: decoded automatically in `normalizeAnime()`.

---

## Phase Roadmap Summary
```
Phase 1 (NOW)    → Site live, scraper running, AdSense pending     $0/mo
Phase 1.5        → AdSense approved → revenue starts               $0/mo
Phase 2 (mo 2-3) → Supabase DB if data needs manual editing        $0/mo
Phase 3+         → NOT PLANNED (per owner decision)
```

---

## How to start a session
Paste this file + tell Claude what you want to do:

```
"I'm continuing AniWatch-BJ88.
Site: https://anime.bj88la.net
GitHub: https://github.com/Kitty99CsI/anime-portal (capital I)
Admin: https://anime.bj88la.net/admin.html (pw: bj88anime)
Full context in attached HANDOFF.md

Today I want to: [your task]"
```

---

## Session History Summary
| Date | Key Work |
|------|----------|
| 2026-03-26 | Initial setup, site live, scraper v1 (62 anime, wrong URL) |
| 2026-03-27 | Scraper v3 (category pages, 4359 slugs found), GitHub Actions fixed |
| 2026-03-28 | Scraper v4 (self-healing), index.html full Thai rebuild, admin rebuilt, mobile fixed, docs created |
