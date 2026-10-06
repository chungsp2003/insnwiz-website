const login = document.querySelector('#login-form');
const form = document.querySelector('#drive-upload');
const status = document.querySelector('#upload-status');
const portal = document.querySelector('#portal');
const list = document.querySelector('#file-list');
let credentials = null;
let folders = [];
let nextPage = '';
let busy = false;
const folderType = 'application/vnd.google-apps.folder';
async function api(path, body, extra = {}) {
  const response = await fetch(path, { method: 'POST', headers: {
    ...credentials, 'Content-Type': 'application/json', ...extra,
  }, body });
  if (!response.ok) {
    let result;
    try { result = await response.json(); } catch { /* Static fallback or gateway error. */ }
    throw new Error(result?.error || 'The service is unavailable. Please contact the site owner.');
  }
  return response;
}
async function action(task) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('main button').forEach(button => { button.disabled = true; });
  try { await task(); }
  catch (error) { status.textContent = error.message || 'The request could not be confirmed. Please contact the site owner.'; }
  finally {
    busy = false;
    document.querySelectorAll('main button').forEach(button => { button.disabled = false; });
  }
}
function renderFiles(files, append) {
  if (!append) list.replaceChildren();
  for (const file of files) {
    const row = document.createElement('li');
    row.style.cssText = 'display:flex;justify-content:space-between;gap:16px;align-items:center;border-bottom:1px solid #ddd;padding:16px 0;overflow-wrap:anywhere';
    const label = document.createElement('span');
    label.textContent = file.name + (file.size ? ` (${(Number(file.size) / 1024 / 1024).toFixed(2)} MB)` : '');
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn-outline-dark';
    button.textContent = file.mimeType === folderType ? 'Open folder' : 'Download';
    button.addEventListener('click', () => action(async () => {
      if (file.mimeType === folderType) {
        await loadFiles(file.id, '', false, true);
      } else {
        status.textContent = `Downloading ${file.name}…`;
        const response = await api('/api/download', JSON.stringify({ id: file.id }));
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const encoded = response.headers.get('Content-Disposition')?.split("filename*=UTF-8''")[1];
        link.href = url; link.download = encoded ? decodeURIComponent(encoded) : file.name;
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        status.textContent = 'Download ready. Check your browser downloads.';
      }
    }));
    row.append(label, button); list.append(row);
  }
  if (!list.children.length) {
    const empty = document.createElement('li'); empty.textContent = 'This folder is empty.'; list.append(empty);
  }
}
async function loadFiles(folder = folders.at(-1), pageToken = '', append = false, push = false) {
  status.textContent = 'Loading files…';
  const result = await (await api('/api/files', JSON.stringify({ folder, pageToken }))).json();
  if (!folders.length || push) folders.push(result.folder.id);
  nextPage = result.nextPageToken || '';
  document.querySelector('#folder-name').textContent = result.folder.name;
  document.querySelector('#back').hidden = folders.length < 2;
  document.querySelector('#more').hidden = !nextPage;
  renderFiles(result.files || [], append);
  status.textContent = '';
}
login.addEventListener('submit', event => {
  event.preventDefault();
  action(async () => {
    credentials = { 'X-Upload-Email': login.elements.email.value.trim(), 'X-Upload-Password': login.elements.password.value };
    folders = [];
    try { await loadFiles(); } catch (error) { credentials = null; throw error; }
    document.querySelector('#signed-in').textContent = `Signed in as ${login.elements.email.value.trim()}`;
    login.reset(); login.hidden = true; portal.hidden = false;
  });
});
document.querySelector('#logout').addEventListener('click', () => {
  credentials = null; folders = []; list.replaceChildren(); form.reset();
  portal.hidden = true; login.hidden = false; status.textContent = 'Signed out.';
});
document.querySelector('#refresh').addEventListener('click', () => action(() => loadFiles()));
document.querySelector('#more').addEventListener('click', () => action(() => loadFiles(folders.at(-1), nextPage, true)));
document.querySelector('#back').addEventListener('click', () => action(async () => {
  const parent = folders.at(-2);
  await loadFiles(parent);
  folders.pop();
  document.querySelector('#back').hidden = folders.length < 2;
}));
form.addEventListener('submit', event => {
  event.preventDefault();
  action(async () => {
    const file = form.elements.file.files[0];
    if (!file || !file.size || file.size > 20 * 1024 * 1024) throw new Error('Choose a non-empty file up to 20 MB.');
    status.textContent = `Uploading ${file.name}… Please keep this page open.`;
    let result;
    try { result = await (await api('/api/upload', file, { 'X-File-Name': encodeURIComponent(file.name), 'Content-Type': 'application/octet-stream' })).json(); }
    catch (error) { throw new Error(`${error.message} Check whether the file arrived before retrying.`); }
    form.reset();
    try { await loadFiles(); } catch { /* Preserve confirmed upload success even when refresh fails. */ }
    status.textContent = `${result.name} was saved to the main shared folder. Refresh to see the latest files.`;
  });
});
