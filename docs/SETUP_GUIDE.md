# Stage-by-Stage Setup Guide
## anime.bj88l.net — GitHub + Cloudflare Pages

---

## ✅ PHASE 1 — Static Demo (Do This Today · $0)

### What it is
Single HTML file, data hardcoded as JSON.
Push to GitHub → Cloudflare auto-deploys → live at `anime.bj88l.net`

### Steps

#### 1. Create GitHub repo
```bash
# On your laptop:
git init anime-portal
cd anime-portal
# Copy all the files from this project into it
git add .
git commit -m "🎌 Initial commit — static demo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/anime-portal.git
git push -u origin main
```

#### 2. Connect to Cloudflare Pages
1. Go to **dash.cloudflare.com** → Pages → Create a project
2. Connect to GitHub → select `anime-portal` repo
3. Build settings:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output: `dist`
4. Click **Save and Deploy**

#### 3. Set custom domain
1. In Cloudflare Pages → your project → Custom domains
2. Add `anime.bj88l.net`
3. Since bj88l.net is already on Cloudflare → DNS added automatically ✅

#### 4. Add GitHub Secrets (for deploy workflow)
Go to your repo → Settings → Secrets → Actions → New secret:
```
CLOUDFLARE_API_TOKEN   ← from Cloudflare: My Profile → API Tokens
CLOUDFLARE_ACCOUNT_ID  ← from Cloudflare: right sidebar on home page
```

### Tools needed (Phase 1)
| Tool | Where | Cost |
|------|-------|------|
| GitHub account | github.com | Free |
| Git (on laptop) | git-scm.com | Free |
| VS Code | code.visualstudio.com | Free |
| Cloudflare account | cloudflare.com | Free |
| Node.js 20+ | nodejs.org | Free |

### Files to copy into `src/pages/index.html`
→ Copy the `anime-portal-v2-demo.html` file we built

---

## 🔄 PHASE 2 — Auto Scraper (Week 2–4 · $0)

### What it adds
- `scripts/scraper.js` calls the real anime-th.com AJAX API
- Runs automatically every Sunday via GitHub Actions cron
- Updates `src/data/anime.json` + `episodes.json`
- Commits the new data → triggers auto-deploy → site updates itself

### Steps

#### 1. Install dependencies
```bash
npm install
```

#### 2. Test scraper locally first
```bash
node scripts/scraper.js
# Should create/update src/data/anime.json
```

#### 3. Test build locally
```bash
npm run build
# Check dist/index.html — should have real data injected
```

#### 4. Enable GitHub Actions
- Push the `.github/workflows/weekly-sync.yml` file
- Go to GitHub → Actions tab → should see "Weekly Data Sync"
- Click **Run workflow** to test it manually

#### 5. Verify the automation loop
```
You push code change
  → deploy.yml triggers
    → builds site
      → deploys to Cloudflare Pages (2-3 min)

Every Sunday 3am (Bangkok)
  → weekly-sync.yml triggers
    → runs scraper.js
      → updates anime.json
        → commits to main
          → triggers deploy.yml
            → site updated with new anime! 🎉
```

### Tools needed (Phase 2)
| Tool | Where | Cost |
|------|-------|------|
| All Phase 1 tools | — | — |
| Node.js npm packages | already in package.json | Free |
| TMDB API key (optional) | themoviedb.org/settings/api | Free |
| Postman | postman.com | Free |

### Getting a TMDB API key (better cover images)
1. Register at themoviedb.org
2. Settings → API → Request API key → Developer
3. Add as GitHub Secret: `TMDB_API_KEY`
4. Uncomment in weekly-sync.yml: `TMDB_API_KEY: ${{ secrets.TMDB_API_KEY }}`

---

## 🚀 PHASE 3 — Full Backend (Month 1–2 · $5–15/mo)

### What it adds
- Proper database (Supabase PostgreSQL) instead of JSON files
- Express.js API backend hosted on Railway
- React + Vite frontend (replaces static HTML)
- Self-hosted images on Cloudflare R2
- Full-text search with Meilisearch

### New repo structure
```
anime-portal/
├── packages/
│   ├── frontend/          ← React + Vite (Cloudflare Pages)
│   └── backend/           ← Express API (Railway)
├── scripts/
│   └── scraper.js         ← same scraper, now writes to Supabase
└── .github/workflows/
    ├── deploy-frontend.yml
    ├── deploy-backend.yml
    └── weekly-sync.yml
```

### Steps (in order)

#### 1. Set up Supabase database
1. supabase.com → New project (free)
2. SQL Editor → paste the schema from BUILD_PLAN.md
3. Get your `SUPABASE_URL` and `SUPABASE_ANON_KEY`

#### 2. Set up Railway backend
1. railway.app → New project → Deploy from GitHub
2. Point to `packages/backend/`
3. Add env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PORT=3001`
4. Costs: $5/month (Hobby plan)

#### 3. Set up Cloudflare R2 for images
1. Cloudflare Dashboard → R2 → Create bucket `anime-covers`
2. Update scraper to download + upload covers instead of hotlinking
3. Costs: First 10GB free, then $0.015/GB

#### 4. Deploy React frontend
1. `npm create vite@latest packages/frontend -- --template react`
2. Set `VITE_API_URL=https://your-backend.railway.app` in Cloudflare Pages env vars
3. Update Cloudflare Pages build command to `cd packages/frontend && npm run build`

### Tools needed (Phase 3)
| Tool | Where | Cost |
|------|-------|------|
| All Phase 1 + 2 tools | — | — |
| Supabase account | supabase.com | Free |
| Railway account | railway.app | $5/mo |
| Cloudflare R2 | cloudflare.com/r2 | Free → $0.015/GB |
| Meilisearch Cloud | cloud.meilisearch.com | Free (100k docs) |
| Google Analytics 4 | analytics.google.com | Free |
| Better Uptime | betteruptime.com | Free |

---

## 📢 AD SETUP (Can Start Phase 1)

### Step 1: Apply for adsco.re (easiest, already used by anime-th.com)
1. Register at adsco.re
2. Submit `anime.bj88l.net` for approval
3. Get your ad tag code (looks like a `<script>` snippet)
4. Replace the `<div class="ad-slot ...">` placeholders in the HTML with their tags

### Step 2: Replace placeholder ad divs
Find these in the HTML and replace with real ad code:
```html
<!-- REPLACE THIS: -->
<div class="ad-slot ad-leaderboard">
  <span>📢 Ad Banner</span>
</div>

<!-- WITH THIS (adsco.re example): -->
<script async src="//ads.adsco.re/js/abc123.js"></script>
<ins class="adscore-ad" data-ad-slot="728x90"></ins>
```

### Ad slot locations (6 slots pre-built)
| # | Location | Size | Expected performance |
|---|----------|------|---------------------|
| 1 | Top leaderboard | 728×90 | Medium |
| 2 | Below video player | 728×60 | ⭐ Highest CTR |
| 3 | Sidebar 1 | 300×250 | High |
| 4 | Sidebar 2 | 300×250 | High |
| 5 | Half page | 300×600 | ⭐ Highest CPM |
| 6 | In-feed | Responsive | Medium |

---

## 🔑 All GitHub Secrets Needed

Go to: GitHub repo → Settings → Secrets → Actions

| Secret name | Where to get it | When needed |
|-------------|----------------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens | Phase 1 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare home → right sidebar | Phase 1 |
| `TMDB_API_KEY` | themoviedb.org → Settings → API | Phase 2 |
| `SUPABASE_URL` | Supabase → Settings → API | Phase 3 |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API | Phase 3 |
| `RAILWAY_TOKEN` | Railway → Account → Tokens | Phase 3 |

---

## 📋 Summary Table

| | Phase 1 | Phase 2 | Phase 3 |
|--|---------|---------|---------|
| **Timeline** | Today | Week 2-4 | Month 1-2 |
| **Cost** | $0 | $0 | $5-15/mo |
| **Data update** | Manual push | Auto weekly | Auto weekly |
| **Stack** | HTML + JSON | + Node scraper | + React + Express + DB |
| **Images** | Hotlinked | + TMDB API | + Self-hosted R2 |
| **Video** | iframe EP1 | iframe all eps | iframe all eps |
| **Search** | JS filter | JS filter | Meilisearch |
| **Ads** | Placeholders | Real ad tags | Real ad tags |
| **Anime count** | 1 (HAR data) | Auto-growing | Auto-growing |
