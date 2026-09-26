export const reply = (body, status = 200) => Response.json(body, { status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
}});
export async function authorize(request, env) {
  if (request.method !== 'POST') return reply({ error: 'Use POST.' }, 405);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return reply({ error: 'Please use this website.' }, 403);
  const keys = ['DRIVE_FOLDER_ID', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'UPLOAD_USERS_JSON'];
  if (keys.some(key => !env[key])) return reply({ error: 'Uploads are not configured yet. Please contact the site owner.' }, 503);
  let users;
  try { users = JSON.parse(env.UPLOAD_USERS_JSON); }
  catch { return reply({ error: 'Account configuration needs attention.' }, 503); }
  const email = (request.headers.get('X-Upload-Email') || '').trim().toLowerCase();
  const password = request.headers.get('X-Upload-Password') || '';
  if (!email || email.length > 254 || !password || password.length > 256) return reply({ error: 'Email or password is incorrect.' }, 401);
  const account = Object.hasOwn(users, email) ? users[email] : null;
  try {
    const salt = account?.salt || '00000000000000000000000000000000';
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations: 100000,
      salt: Uint8Array.from(salt.match(/.{2}/g), byte => parseInt(byte, 16)),
    }, key, 256);
    const actual = Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
    const expected = account?.hash || '0'.repeat(64);
    let different = actual.length ^ expected.length;
    for (let i = 0; i < actual.length; i++) different |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
    if (!account || different) return reply({ error: 'Email or password is incorrect.' }, 401);
  } catch { return reply({ error: 'Account configuration needs attention.' }, 503); }
  return null;
}
export async function driveToken(env) {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token',
      }), signal: AbortSignal.timeout(15000),
    });
    if (!tokenResponse.ok) throw new Error('Google connection unavailable');
    const token = await tokenResponse.json();
    if (!token.access_token) throw new Error('Missing access token');
  return token.access_token;
}
export async function driveGet(path, token) {
  const result = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
  });
  if (!result.ok) throw new Error('Drive request failed');
  return result;
}
// Walk real parents, never shortcuts, to keep every request inside the configured folder.
export async function checkedFile(id, env, token) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  const file = await (await driveGet(`files/${id}?supportsAllDrives=true&fields=id,name,mimeType,parents,trashed,size`, token)).json();
  if (file.trashed || file.mimeType === 'application/vnd.google-apps.shortcut') return null;
  let current = file;
  for (let depth = 0; depth < 32; depth++) {
    if (current.id === env.DRIVE_FOLDER_ID) return file;
    const parent = current.parents?.[0];
    if (!parent) return null;
    current = await (await driveGet(`files/${parent}?supportsAllDrives=true&fields=id,parents,trashed`, token)).json();
    if (current.trashed) return null;
  }
  return null;
}
