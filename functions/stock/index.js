import { authorizeStock } from '../_lib/stock-auth.js';

export async function onRequest({ request, env }) {
  const denied = await authorizeStock(request, env);
  if (denied) return denied;
  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>Stock | InsightnWisdom</title>
<link rel="stylesheet" href="/assets/styles.css">
<style>
  .stock-panel { max-width: 760px; margin: 48px auto; padding: 0 20px 80px; }
  .stock-card { background: #fff; border: 1px solid #dbe5ea; border-radius: 16px; padding: 28px; box-shadow: 0 12px 35px #1018270d; }
  .stock-form { display: flex; gap: 12px; flex-wrap: wrap; margin: 22px 0; }
  .stock-form input { flex: 1 1 200px; padding: 12px 14px; border: 1px solid #9fb2be; border-radius: 8px; font: inherit; }
  .stock-form button { cursor: pointer; }
  .stock-result { border-top: 1px solid #dbe5ea; padding-top: 22px; }
  .stock-price { font-size: clamp(2rem, 7vw, 3.5rem); font-weight: 800; color: #101827; margin: 8px 0; }
  .stock-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 16px; margin-top: 20px; }
  .stock-meta dt { color: #536878; font-size: .9rem; }
  .stock-meta dd { margin: 4px 0 0; font-weight: 700; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="nav-wrap"><a class="brand" href="/"><span class="brand-mark">IW</span><span class="brand-name">InsightnWisdom<small>AI &amp; Infrastructure</small></span></a></div></header>
<main id="main" class="stock-panel">
  <div class="eyebrow">PRIVATE STOCK AREA</div>
  <h1>Stock quotes</h1>
  <p>Look up Korean stocks through the Kiwoom REST API. Quotes may be delayed. This page cannot place trades.</p>
  <div class="stock-card">
    <form id="quote-form" class="stock-form">
      <label for="code">Stock code</label>
      <input id="code" name="code" inputmode="text" autocomplete="off" pattern="[0-9]{6}(_(NX|AL))?" placeholder="005930" maxlength="9" required>
      <button class="btn btn-primary-light" type="submit">Get quote</button>
    </form>
    <p id="stock-status" role="status" aria-live="polite"></p>
    <section id="stock-result" class="stock-result" hidden aria-label="Quote result">
      <h2 id="stock-name"></h2>
      <p id="stock-price" class="stock-price"></p>
      <dl class="stock-meta">
        <div><dt>Stock code</dt><dd id="stock-code"></dd></div>
        <div><dt>Day change</dt><dd id="stock-change"></dd></div>
        <div><dt>Change rate</dt><dd id="stock-rate"></dd></div>
        <div><dt>Volume</dt><dd id="stock-volume"></dd></div>
      </dl>
      <p id="stock-asof" class="form-note"></p>
    </section>
  </div>
</main>
<script src="/assets/stock.js" defer></script>
</body>
</html>
`, { headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive', 'X-Content-Type-Options': 'nosniff',
  } });
}
