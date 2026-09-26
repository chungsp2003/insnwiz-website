import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { onRequest } from '../functions/api/upload.js';
const password = 'test-password-long-enough';
const salt = '12'.repeat(16);
const env = { DRIVE_FOLDER_ID: 'fixed-folder', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret', GOOGLE_REFRESH_TOKEN: 'refresh', UPLOAD_USERS_JSON: JSON.stringify({ 'person@example.com': { salt, hash: pbkdf2Sync(password, Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex') } }) };
function request(headers = {}, body = 'hello') {
  return new Request('https://insnwiz.com/api/upload', { method: 'POST', headers: { Origin: 'https://insnwiz.com', 'X-Upload-Email': 'person@example.com', 'X-Upload-Password': password, 'X-File-Name': encodeURIComponent('사진.txt'), ...headers }, body });
}
test('rejects missing configuration, cross-origin, wrong passwords, unknown users, and empty files', async () => {
  assert.equal((await onRequest({ request: request(), env: {} })).status, 503);
  assert.equal((await onRequest({ request: request({ Origin: 'https://evil.example' }), env })).status, 403);
  assert.equal((await onRequest({ request: request({ 'X-Upload-Password': 'wrong' }), env })).status, 401);
  assert.equal((await onRequest({ request: request({ 'X-Upload-Email': 'unknown@example.com' }), env })).status, 401);
  assert.equal((await onRequest({ request: request({}, ''), env })).status, 400);
  assert.equal((await onRequest({ request: request({ 'Content-Length': String(21 * 1024 * 1024) }), env })).status, 413);
  assert.equal((await onRequest({ request: request({}, new Uint8Array(20 * 1024 * 1024 + 1)), env })).status, 413);
});
test('uploads into server-selected folder and handles Google failures without leaking secrets', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    if (calls === 1) return Response.json({ access_token: 'private-token' });
    assert.match(url, /uploadType=multipart/);
    const body = await options.body.text();
    assert.match(body, /"parents":\["fixed-folder"\]/);
    assert.match(body, /写真|사진/);
    assert.match(body, /hello/);
    return Response.json({ id: 'created-file' });
  };
  try {
    const response = await onRequest({ request: request(), env });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { name: '사진.txt', uploaded: true });
    assert.equal(calls, 2);
    globalThis.fetch = async () => new Response('private error', { status: 401 });
    const failed = await onRequest({ request: request(), env });
    assert.equal(failed.status, 502);
    assert.doesNotMatch(await failed.text(), /private error|private-token/);
  } finally { globalThis.fetch = original; }
});
