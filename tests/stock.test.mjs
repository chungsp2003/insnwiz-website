import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { onRequest as gate } from '../functions/stock/index.js';
import { onRequest as quote } from '../functions/stock/api/quote.js';

const salt = 'ab'.repeat(16);
const password = 'a-long-unique-password';
const env = { STOCK_USERS_JSON: JSON.stringify({ 'ben@insnwiz.com': {
  salt, hash: pbkdf2Sync(password, Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex'),
} }), KIWOOM_MODE: 'demo', KIWOOM_APP_KEY: 'key', KIWOOM_APP_SECRET: 'secret' };
const basic = (email = 'ben@insnwiz.com', pass = password) => `Basic ${Buffer.from(`${email}:${pass}`).toString('base64')}`;
const request = (code = '005930', headers = {}) => new Request('https://insnwiz.com/stock/api/quote', {
  method: 'POST', headers: { Origin: 'https://insnwiz.com', Authorization: basic(), ...headers }, body: JSON.stringify({ code }),
});

test('private Stock page fails closed and requires approved credentials', async () => {
  const context = (headers, settings = env) => ({ request: new Request('https://insnwiz.com/stock/', { headers }), env: settings });
  assert.equal((await gate(context({}, {}))).status, 503);
  const missing = await gate(context({}));
  assert.equal(missing.status, 401);
  assert.match(missing.headers.get('WWW-Authenticate'), /Basic/);
  assert.equal((await gate(context({ Authorization: basic('ben@insnwiz.com', 'wrong') }))).status, 401);
  assert.equal((await gate(context({ Authorization: basic('other@insnwiz.com') }))).status, 401);
  const allowed = await gate(context({ Authorization: basic() }));
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('Cache-Control'), 'no-store');
  assert.match(allowed.headers.get('X-Robots-Tag'), /noindex/);
  assert.match(await allowed.text(), /Stock quotes/);
});

test('quote uses only Kiwoom read-only endpoints and hides secrets', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) return Response.json({ return_code: 0, token: 'private-token' });
    return Response.json({ return_code: 0, stk_nm: 'Samsung Electronics', cur_prc: '+75000', pred_pre: '+1000', flu_rt: '+1.35', trde_qty: '100000' });
  };
  try {
    assert.equal((await quote({ request: request('005930', { Origin: 'https://evil.example' }), env })).status, 403);
    assert.equal((await quote({ request: request('bad'), env })).status, 400);
    assert.equal((await quote({ request: request('005930', { Authorization: basic('ben@insnwiz.com', 'wrong') }), env })).status, 401);
    assert.equal((await quote({ request: request(), env: { ...env, KIWOOM_MODE: undefined } })).status, 503);
    const response = await quote({ request: request(), env });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual((await response.json()).name, 'Samsung Electronics');
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'https://mockapi.kiwoom.com/oauth2/token');
    assert.equal(calls[1].url, 'https://mockapi.kiwoom.com/api/dostk/stkinfo');
    assert.equal(calls[1].options.headers['api-id'], 'ka10001');
    assert.equal(calls[1].options.headers.authorization, 'Bearer private-token');
    assert.deepEqual(JSON.parse(calls[1].options.body), { stk_cd: '005930' });
    globalThis.fetch = async () => new Response('secret-in-upstream-error', { status: 500 });
    const failed = await quote({ request: request(), env });
    assert.equal(failed.status, 502);
    assert.doesNotMatch(await failed.text(), /secret-in-upstream-error|private-token|secret/);
  } finally { globalThis.fetch = original; }
});
