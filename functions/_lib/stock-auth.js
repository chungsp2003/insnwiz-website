const noStore = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export function stockReply(body, status = 200) {
  return Response.json(body, { status, headers: noStore });
}

export async function authorizeStock(request, env) {
  if (!env.STOCK_USERS_JSON) return stockReply({ error: 'Stock access is not configured.' }, 503);
  let users;
  try { users = JSON.parse(env.STOCK_USERS_JSON); }
  catch { return stockReply({ error: 'Stock access needs configuration.' }, 503); }
  if (!users || typeof users !== 'object' || Array.isArray(users)) return stockReply({ error: 'Stock access needs configuration.' }, 503);

  let email = '';
  let password = '';
  const header = request.headers.get('Authorization') || '';
  if (header.startsWith('Basic ')) {
    try {
      const bytes = Uint8Array.from(atob(header.slice(6)), character => character.charCodeAt(0));
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      const separator = decoded.indexOf(':');
      if (separator >= 0) {
        email = decoded.slice(0, separator).trim().toLowerCase();
        password = decoded.slice(separator + 1);
      }
    } catch { /* Invalid Basic credentials are handled as unauthorized. */ }
  }
  const account = email && email.length <= 254 && Object.hasOwn(users, email) ? users[email] : null;
  const salt = typeof account?.salt === 'string' && /^[a-f0-9]{32}$/i.test(account.salt) ? account.salt : '0'.repeat(32);
  const expected = typeof account?.hash === 'string' && /^[a-f0-9]{64}$/i.test(account.hash) ? account.hash.toLowerCase() : '0'.repeat(64);
  if (password.length > 256) password = '';
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations: 100000,
      salt: Uint8Array.from(salt.match(/.{2}/g), byte => parseInt(byte, 16)),
    }, key, 256);
    const actual = new Uint8Array(bits);
    const target = Uint8Array.from(expected.match(/.{2}/g), byte => parseInt(byte, 16));
    let mismatch = 0;
    for (let i = 0; i < 32; i++) mismatch |= actual[i] ^ target[i];
    if (account && !mismatch && email && password) return null;
  } catch { return stockReply({ error: 'Stock access needs configuration.' }, 503); }
  return new Response('Stock access requires an approved account.', { status: 401, headers: {
    ...noStore, 'Content-Type': 'text/plain; charset=utf-8', 'WWW-Authenticate': 'Basic realm="InsnWiz Stock", charset="UTF-8"',
  } });
}
