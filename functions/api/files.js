import { authorize, checkedFile, driveGet, driveToken, reply } from '../_lib/drive.js';
export async function onRequest({ request, env }) {
  const denied = await authorize(request, env);
  if (denied) return denied;
  let body;
  try { body = await request.json(); } catch { return reply({ error: 'Invalid request.' }, 400); }
  const folder = body.folder || env.DRIVE_FOLDER_ID;
  if (typeof folder !== 'string' || typeof (body.pageToken || '') !== 'string') return reply({ error: 'Invalid folder.' }, 400);
  try {
    const token = await driveToken(env);
    const allowed = await checkedFile(folder, env, token);
    if (!allowed || allowed.mimeType !== 'application/vnd.google-apps.folder') return reply({ error: 'Folder not available.' }, 403);
    const query = new URLSearchParams({
      q: `'${folder}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.shortcut'`,
      fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime)',
      pageSize: '100', orderBy: 'folder,name', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true',
    });
    if (body.pageToken) query.set('pageToken', body.pageToken);
    const result = await (await driveGet(`files?${query}`, token)).json();
    return reply({ ...result, folder: { id: allowed.id, name: allowed.name } });
  } catch { return reply({ error: 'Could not load files. The site owner may need to reconnect Google Drive.' }, 502); }
}
