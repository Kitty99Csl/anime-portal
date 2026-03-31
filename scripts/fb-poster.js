// fb-poster.js — AniWatch BJ88
// GitHub Actions runs this daily at 8:00 AM Bangkok time
// Job: fetch random anime → generate Lao caption via Gemini → save to Supabase
// Make.com then reads from Supabase and posts to Facebook

const SUPABASE_URL = 'https://pzrzdljwglybljthbffl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GEMINI_KEY   = process.env.GEMINI_KEY;

const GEMINI_MODEL = 'gemini-2.5-flash';
const SITE_URL     = 'https://anime.bj88la.net';

// ─── 1. Fetch one random unposted anime ───────────────────────────────────────
async function fetchAnime() {
  const params = new URLSearchParams({
    site_id:      'eq.1',
    fb_posted_at: 'is.null',
    fb_caption:   'is.null',
    'cover_url':  'not.is.null',
    status:       'neq.upcoming',
    select:       'id,title_en,title_th,cover_url,description,genres,episode_count,status,year,slug',
    order:        'random()',
    limit:        '1',
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?${params}`, {
    headers: {
      apikey:        SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} — ${await res.text()}`);
  const rows = await res.json();
  if (!rows.length) throw new Error('No unposted anime left!');
  return rows[0];
}

// ─── 2. Generate Lao caption via Gemini ───────────────────────────────────────
async function generateCaption(anime) {
  const statusLao =
    anime.status === 'airing'   ? 'ກຳລັງອອກອາກາດ' :
    anime.status === 'complete' ? 'ຈົບແລ້ວ'        : 'ໃກ້ຈະອອກ';

  const genres = Array.isArray(anime.genres)
    ? anime.genres.join(', ')
    : (anime.genres || 'Action');

  const prompt =
`ເຈົ້າແມ່ນຜູ້ຂຽນໂພສ Facebook ສຳລັບເວັບໄຊດ໌ AniWatch BJ88 (anime.bj88la.net) ທີ່ໃຫ້ຄົນລາວເບິ່ງອານິເມ.

ໜ້າວຽກ: ຂຽນໂພສ Facebook ເປັນພາສາລາວ 100% ສຳລັບອານິເມຊຸດນີ້.

ຂໍ້ມູນ:
- ຊື່: ${anime.title_en}
- ປີ: ${anime.year}
- ຈຳນວນຕອນ: ${anime.episode_count} ຕອນ
- ປະເພດ: ${genres}
- ສະຖານະ: ${statusLao}
- ເນື້ອເລື່ອງ (ອ້າງອີງ): ${anime.description || 'ບໍ່ມີຂໍ້ມູນ'}

ໂຄງສ້າງ:
1. ປະໂຫຍກເປີດ — ດຶງດູດ, ກ່າວຊື່ອານິເມ
2. ເນື້ອໃນ — 2 ປະໂຫຍກ ກ່ຽວກັບຄວາມດີຂອງເລື່ອງ (ໃຊ້ຄວາມຮູ້ຂອງເຈົ້າ)
3. Call to action — ສັ້ນ ອົບອຸ່ນ
4. ຄຳຖາມ — 1 ຄຳຖາມ ກະຕຸ້ນ comment
5. Hashtag — 5 ໂຕ ໃນແຖວດຽວ (ລາວ + English)
6. ລິ້ງ: ▶ ${SITE_URL}/#${anime.slug}

ກົດເດັດຂາດ:
- ຂຽນລາວລ້ວນ — ຫ້າມໃຊ້ພາສາໄທ
- ຫ້າມໃຊ້ຕົວໜາ ຫຼື bullet
- ຫ້າມໃສ່ label (Hook: / CTA: / ລິ້ງ:)
- English ໃຊ້ໄດ້ພຽງໃນ hashtag ແລະ URL
- ຄວາມຍາວ: 80-120 ຄຳ
- emoji: 2-3 ໂຕ ທຳມະຊາດ

ໂທນ: ອົບອຸ່ນ ເໝືອນໝູ່ຮັກອານິເມ — ບໍ່ໃຊ່ໂຄສະນາ`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.85 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini error: ${res.status} — ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini returned empty content');
  return text;
}

// ─── 3. Save caption + cover_url to Supabase ──────────────────────────────────
async function saveCaption(anime, caption) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/anime?id=eq.${anime.id}`,
    {
      method:  'PATCH',
      headers: {
        apikey:         SUPABASE_KEY,
        Authorization:  `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer:         'return=minimal',
      },
      body: JSON.stringify({ fb_caption: caption }),
    }
  );
  if (!res.ok) throw new Error(`Supabase save failed: ${res.status} — ${await res.text()}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== AniWatch BJ88 — Gemini Caption Generator ===');
  console.log(`Time: ${new Date().toISOString()}\n`);

  if (!SUPABASE_KEY) throw new Error('Missing env: SUPABASE_KEY');
  if (!GEMINI_KEY)   throw new Error('Missing env: GEMINI_KEY');

  console.log('[1/3] Fetching random unposted anime...');
  const anime = await fetchAnime();
  console.log(`  → ${anime.title_en} (id: ${anime.id})`);
  console.log(`  → cover_url: ${anime.cover_url}\n`);

  console.log('[2/3] Generating Lao caption via Gemini 2.5 Flash...');
  const caption = await generateCaption(anime);
  console.log('  → Caption generated:\n');
  console.log(caption);
  console.log('');

  console.log('[3/3] Saving to Supabase...');
  await saveCaption(anime, caption);
  console.log(`  → fb_caption saved for anime id ${anime.id}\n`);

  console.log('✅ Done — Make.com will pick this up and post to Facebook.');
}

main().catch(err => {
  console.error('\n❌ FAILED:', err.message);
  process.exit(1);
});
