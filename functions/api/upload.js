const LIMIT = 20 * 1024 * 1024;
const reply = (body, status = 200) => Response.json(body, { status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
}});

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return reply({ error: 'Use POST to upload a file.' }, 405);
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return reply({ error: 'Please upload from this website.' }, 403);
  }
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
  let name;
  try { name = decodeURIComponent(request.headers.get('X-File-Name') || '').split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f]/g, '').trim(); }
  catch { return reply({ error: 'Invalid filename.' }, 400); }
  if (!name || name.length > 255) return reply({ error: 'Choose a file with a valid name (up to 255 characters).' }, 400);
  if (Number(request.headers.get('Content-Length')) > LIMIT) return reply({ error: 'Maximum file size is 20 MB.' }, 413);
  if (!request.body) return reply({ error: 'Choose a non-empty file.' }, 400);
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > LIMIT) {
        await reader.cancel();
        return reply({ error: 'Maximum file size is 20 MB.' }, 413);
      }
      chunks.push(value);
    }
    if (!size) return reply({ error: 'Choose a non-empty file.' }, 400);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token',
      }), signal: AbortSignal.timeout(15000),
    });
    if (!tokenResponse.ok) return reply({ error: 'Google Drive connection needs attention. Please contact the site owner.' }, 502);
    const token = await tokenResponse.json();
    if (!token.access_token) throw new Error('Missing access token');
    const boundary = `upload_${crypto.randomUUID()}`;
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify({ name, parents: [env.DRIVE_FOLDER_ID] }),
      `\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
      ...chunks, `\r\n--${boundary}--\r\n`,
    ]);
    const result = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id', {
      method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body, signal: AbortSignal.timeout(60000),
    });
    if (!result.ok) return reply({ error: 'Google Drive could not save the file. Please contact the site owner before retrying.' }, 502);
    const file = await result.json();
    if (!file.id) throw new Error('Missing file ID');
    return reply({ name, uploaded: true }, 201);
  } catch {
    return reply({ error: 'The upload could not be confirmed. Check with the site owner before retrying to avoid duplicates.' }, 502);
  }
}
