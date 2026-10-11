import { authorizeStock } from '../_lib/stock-auth.js';

export async function onRequest({ request, env }) {
  const denied = await authorizeStock(request, env);
  if (denied) return denied;
  return new Response('Not found.', { status: 404, headers: {
    'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  } });
}
