import { authorizeStock, stockReply } from '../../_lib/stock-auth.js';

const hosts = { demo: 'https://mockapi.kiwoom.com', real: 'https://api.kiwoom.com' };

export async function onRequest({ request, env }) {
  const denied = await authorizeStock(request, env);
  if (denied) return denied;
  if (request.method !== 'POST') return stockReply({ error: 'Use POST.' }, 405);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return stockReply({ error: 'Please use this website.' }, 403);
  if (!env.KIWOOM_APP_KEY || !env.KIWOOM_APP_SECRET || !Object.hasOwn(hosts, env.KIWOOM_MODE)) {
    return stockReply({ error: 'Kiwoom is not configured yet.' }, 503);
  }
  let input;
  try { input = await request.json(); } catch { return stockReply({ error: 'Invalid request.' }, 400); }
  const code = String(input?.code || '').trim().toUpperCase();
  if (!/^\d{6}(?:_(?:NX|AL))?$/.test(code)) return stockReply({ error: 'Enter a valid six-digit Korean stock code.' }, 400);

  const host = hosts[env.KIWOOM_MODE];
  try {
    const tokenResponse = await fetch(`${host}/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({ grant_type: 'client_credentials', appkey: env.KIWOOM_APP_KEY, secretkey: env.KIWOOM_APP_SECRET }),
      signal: AbortSignal.timeout(15000),
    });
    if (!tokenResponse.ok) throw new Error('token');
    const tokenData = await tokenResponse.json();
    if (Number(tokenData.return_code ?? 0) !== 0 || !tokenData.token) throw new Error('token');
    const quoteResponse = await fetch(`${host}/api/dostk/stkinfo`, { method: 'POST', headers: {
      'Content-Type': 'application/json;charset=UTF-8', 'api-id': 'ka10001', authorization: `Bearer ${tokenData.token}`,
    }, body: JSON.stringify({ stk_cd: code }), signal: AbortSignal.timeout(15000) });
    if (!quoteResponse.ok) throw new Error('quote');
    const quote = await quoteResponse.json();
    if (Number(quote.return_code ?? 0) !== 0) throw new Error('quote');
    return stockReply({ code, name: quote.stk_nm ?? '', price: quote.cur_prc ?? null,
      change: quote.pred_pre ?? null, changeRate: quote.flu_rt ?? null, volume: quote.trde_qty ?? null,
      asOf: new Date().toISOString(), mode: env.KIWOOM_MODE,
    });
  } catch { return stockReply({ error: 'Kiwoom quote is unavailable. Check the API setup and try again.' }, 502); }
}
