const GOOGLE_PLATFORM_URL = 'https://script.google.com/macros/s/AKfycbzJRblwkScQZuKpUQjiwkpZIMKyY0-h4vO8aFhqqVU2rgINbxYDPW0nH60YL8Pxpz0r/exec';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/platform') return env.ASSETS.fetch(request);
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });

    const upstream = new URL(GOOGLE_PLATFORM_URL);
    upstream.search = url.search;

    try {
      const response = await fetch(upstream, { redirect: 'follow' });
      return new Response(response.body, {
        status: response.status,
        headers: {
          'content-type': response.headers.get('content-type') || 'text/javascript; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    } catch {
      return new Response('/* platform unavailable */', {
        status: 502,
        headers: { 'content-type': 'text/javascript; charset=utf-8' },
      });
    }
  },
};
