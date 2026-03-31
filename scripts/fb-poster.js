// fb-poster.js — AniWatch BJ88 Facebook Auto-Poster
// Runs via GitHub Actions daily at 8am Bangkok time
// Uses: Supabase (anime data) → Gemini 2.5 Flash (Lao writing) → Facebook Graph API

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GEMINI_KEY   = process.env.GEMINI_KEY;
const FB_PAGE_ID   = process.env.FB_PAGE_ID;
const FB_TOKEN     = process.env.FB_TOKEN;

const SITE_URL = 'https://anime.bj88la.net';
const GEMINI_MODEL = 'gemini-2.5-flash';

// ─── 1. Fetch one random unposted anime from Supabase ─────────────────────────
async function fetchAnime() {
  const url =
    `${SUPABASE_URL}/rest/v1/anime` +
    `?site_id=eq.1` +
    `&fb_posted_at=is.null` +
    `&cover_url=not.is.null` +
    `&status=neq.upcoming` +
    `&select=id,title_en,title_th,cover_url,description,genres,episode_count,status,year,slug` +
    `&order=random()` +
    `&limit=1`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data.length) throw new Error('No unposted anime found — all anime have been posted!');
  return data[0];
}

// ─── 2. Generate Lao post caption via Gemini ──────────────────────────────────
async function generateCaption(anime) {
  const status = anime.status === 'airing'
    ? 'ກຳລັງອອກອາກາດ'
    : anime.status === 'complete'
    ? 'ຈົບແລ້ວ'
    : 'ໃກ້ຈະອອກ';

  const genres = Array.isArray(anime.genres)
    ? anime.genres.join(', ')
    : anime.genres;

  const prompt = `ເຈົ້າແມ່ນຜູ້ຂຽນໂພສ Facebook ສຳລັບເວັບໄຊດ໌ AniWatch BJ88 (anime.bj88la.net) ທີ່ໃຫ້ຄົນລາວເບິ່ງອານິເມ.

ໜ້າວຽກຂອງເຈົ້າ: ຂຽນໂພສ Facebook ເປັນພາສາລາວ 100% ສຳລັບອານິເມຊຸດນີ້.

ຂໍ້ມູນອານິເມ:
- ຊື່: ${anime.title_en}
- ປີ: ${anime.year}
- ຈຳນວນຕອນ: ${anime.episode_count} ຕອນ
- ປະເພດ: ${genres}
- ສະຖານະ: ${status}
- ເນື້ອເລື່ອງ (ອ້າງອີງ): ${anime.description}

ໂຄງສ້າງໂພສ:
1. ປະໂຫຍກເປີດ — ດຶງດູດຄວາມສົນໃຈ, ກ່າວຊື່ອານິເມ
2. ເນື້ອໃນ — 2 ປະໂຫຍກ ອະທິບາຍວ່ານີ້ດີຫຍັງ ໃຊ້ຄວາມຮູ້ຂອງເຈົ້າກ່ຽວກັບອານິເມຊຸດນີ້
3. Call to action — ສັ້ນ, ອົບອຸ່ນ
4. ຄຳຖາມ — 1 ຄຳຖາມງ່າຍໆ ເພື່ອກະຕຸ້ນ comment
5. Hashtag — 5 ໂຕ ຢູ່ໃນແຖວດຽວ (ລາວ + ອັງກິດ)
6. ລິ້ງ: ▶ ${SITE_URL}/#${anime.slug}

ກົດຫ້າມເດັດຂາດ:
- ຫ້າມໃຊ້ພາສາໄທ — ຂຽນລາວລ້ວນ
- ຫ້າມໃຊ້ຕົວໜາ ຫຼື bullet point
- ຫ້າມໃຊ້ label ເຊັ່ນ "Hook:" "CTA:" "ລິ້ງ:"
- ຫ້າມໃຊ້ English ນອກຈາກໃນ hashtag ແລະ URL
- ຂະໜາດ: 80-120 ຄຳ
- emoji: 2-3 ໂຕ ຢູ່ໃນທຳມະຊາດ ບໍ່ໃຫ້ຂຶ້ນຕົ້ນທຸກປະໂຫຍກ

ໂທນ: ອົບອຸ່ນ, ເໝືອນໝູ່ຮັກອານິເມ ລົມກັນ — ບໍ່ໃຊ່ໂຄສະນາ`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.85 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini returned empty content');
  return text;
}

// ─── 3. Post to Facebook with image ───────────────────────────────────────────
async function postToFacebook(anime, caption) {
  const body = new URLSearchParams({
    url:          anime.cover_url,
    message:      caption,
    access_token: FB_TOKEN,
  });

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/photos`,
    { method: 'POST', body }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Facebook post failed: ${JSON.stringify(data.error || data)}`);
  }
  return data.id;
}

// ─── 4. Mark anime as posted in Supabase ──────────────────────────────────────
async function markPosted(animeId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/anime?id=eq.${animeId}`,
    {
      method: 'PATCH',
      headers: {
        apikey:         SUPABASE_KEY,
        Authorization:  `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer:         'return=minimal',
      },
      body: JSON.stringify({ fb_posted_at: new Date().toISOString() }),
    }
  );
  if (!res.ok) throw new Error(`Supabase update failed: ${res.status}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== AniWatch BJ88 Facebook Auto-Poster ===');
  console.log(`Time: ${new Date().toISOString()}`);

  // Validate env vars
  const required = { SUPABASE_URL, SUPABASE_KEY, GEMINI_KEY, FB_PAGE_ID, FB_TOKEN };
  for (const [key, val] of Object.entries(required)) {
    if (!val) throw new Error(`Missing environment variable: ${key}`);
  }

  console.log('\n[1/4] Fetching random unposted anime...');
  const anime = await fetchAnime();
  console.log(`  → Selected: ${anime.title_en} (id: ${anime.id})`);
  console.log(`  → Cover: ${anime.cover_url}`);

  console.log('\n[2/4] Generating Lao caption via Gemini 2.5 Flash...');
  const caption = await generateCaption(anime);
  console.log('  → Caption preview:');
  console.log('  ' + caption.split('\n').join('\n  '));

  console.log('\n[3/4] Posting to Facebook...');
  const postId = await postToFacebook(anime, caption);
  console.log(`  → Posted! Facebook post ID: ${postId}`);

  console.log('\n[4/4] Marking anime as posted in Supabase...');
  await markPosted(anime.id);
  console.log(`  → anime.fb_posted_at updated for id ${anime.id}`);

  console.log('\n✅ Done! Post published successfully.');
}

main().catch(err => {
  console.error('\n❌ FAILED:', err.message);
  process.exit(1);
});
