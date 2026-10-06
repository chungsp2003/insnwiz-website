import { authorize, driveToken, reply } from '../_lib/drive.js';
const LIMIT = 20 * 1024 * 1024;
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return reply({ error: 'Use POST to upload a file.' }, 405);
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return reply({ error: 'Please upload from this website.' }, 403);
  }
  const denied = await authorize(request, env);
  if (denied) return denied;
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
    const token = await driveToken(env);
    const boundary = `upload_${crypto.randomUUID()}`;
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify({ name, parents: [env.DRIVE_FOLDER_ID] }),
      `\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
      ...chunks, `\r\n--${boundary}--\r\n`,
    ]);
    const result = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
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
