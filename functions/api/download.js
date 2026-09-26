import { authorize, checkedFile, driveGet, driveToken, reply } from '../_lib/drive.js';
const exports = {
  'application/vnd.google-apps.document': ['application/pdf', '.pdf'],
  'application/vnd.google-apps.spreadsheet': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'],
  'application/vnd.google-apps.presentation': ['application/pdf', '.pdf'],
  'application/vnd.google-apps.drawing': ['application/pdf', '.pdf'],
};
export async function onRequest({ request, env }) {
  const denied = await authorize(request, env);
  if (denied) return denied;
  let id;
  try { ({ id } = await request.json()); } catch { return reply({ error: 'Invalid request.' }, 400); }
  if (typeof id !== 'string') return reply({ error: 'Invalid file.' }, 400);
  try {
    const token = await driveToken(env);
    const file = await checkedFile(id, env, token);
    if (!file || file.mimeType === 'application/vnd.google-apps.folder') return reply({ error: 'File not available.' }, 403);
    const format = exports[file.mimeType];
    if (file.mimeType.startsWith('application/vnd.google-apps.') && !format) return reply({ error: 'This Google file type cannot be downloaded here.' }, 400);
    const path = format ? `files/${id}/export?mimeType=${encodeURIComponent(format[0])}` : `files/${id}?alt=media&supportsAllDrives=true`;
    const result = await driveGet(path, token);
    const name = file.name + (format?.[1] || '');
    const encoded = encodeURIComponent(name).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16));
    return new Response(result.body, { headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    }});
  } catch { return reply({ error: 'Download failed. Please try again or contact the site owner.' }, 502); }
}
