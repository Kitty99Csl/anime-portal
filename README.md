# 🎌 AniWatch TH — anime.bj88l.net

> Japanese anime portal with Thai subtitles — auto-updated via GitHub Actions

[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deployed-Cloudflare%20Pages-orange)](https://anime.bj88l.net)
[![Data Sync](https://img.shields.io/badge/Data%20Sync-Weekly%20Sunday-blue)](#)
[![License](https://img.shields.io/badge/License-MIT-green)](#)

---

## 🗂️ Project Structure

```
anime-portal/
├── .github/
│   └── workflows/
│       ├── deploy.yml          ← Auto-deploy on push to main
│       └── weekly-sync.yml     ← Weekly scraper cron job
├── src/
│   ├── data/
│   │   ├── anime.json          ← Our database snapshot (auto-updated)
│   │   └── episodes.json       ← Episode list per anime
│   ├── pages/
│   │   ├── index.html          ← Listing page
│   │   └── watch.html          ← Watch/detail page
│   └── components/             ← Reusable HTML partials (Phase 2+)
├── scripts/
│   ├── scraper.js              ← Crawls anime-th.com AJAX API
│   └── build.js                ← Injects JSON data into HTML templates
├── public/                     ← Static assets (CSS, JS, images)
├── docs/                       ← Documentation
└── package.json
```

---

## 🚀 Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/anime-portal.git
cd anime-portal

# 2. Install dependencies
npm install

# 3. Run scraper manually
npm run scrape

# 4. Build the site
npm run build

# 5. Preview locally
npm run preview
```

---

## 🔄 How Auto-Update Works

```
Every Sunday 3am (Bangkok time)
  GitHub Actions runs scripts/scraper.js
    → Calls anime-th.com AJAX API
    → Updates src/data/anime.json
    → Commits changes to main branch
    → Cloudflare Pages auto-deploys
```

---

## 📋 Stages

| Stage | Status | Branch |
|-------|--------|--------|
| Phase 1 — Static Demo | ✅ Live | `main` |
| Phase 2 — Auto Scraper | 🔄 Building | `phase-2` |
| Phase 3 — Full Backend | 📅 Planned | `phase-3` |

---

## ⚠️ Legal Notice

This project embeds video via iframe from the source site and does not host any video files.
All video content is served from the original provider's servers.
