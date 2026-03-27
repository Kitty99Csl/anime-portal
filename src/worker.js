/**
 * src/worker.js
 * AniWatch-BJ88 — Cloudflare Worker
 * Serves static files + handles special routes (ads.txt, sitemap.xml)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve ads.txt from bj88la.net root
    if (url.pathname === '/ads.txt') {
      return new Response(
        'google.com, pub-6565202571679235, DIRECT, f08c47fec0942fa0',
        { headers: { 'Content-Type': 'text/plain' } }
      );
    }

    // Serve sitemap.xml
    if (url.pathname === '/sitemap.xml') {
      return env.ASSETS.fetch(new Request(url.origin + '/public/sitemap.xml', request));
    }

    // Route all other requests to static assets
    try {
      return await env.ASSETS.fetch(request);
    } catch {
      // Fallback to index.html for SPA routing
      return env.ASSETS.fetch(new Request(url.origin + '/index.html', request));
    }
  }
};
