const form = document.querySelector('#quote-form');
const status = document.querySelector('#stock-status');
const result = document.querySelector('#stock-result');
const amount = (value, absolute = false) => {
  const number = Number(String(value ?? '').replaceAll(',', ''));
  return value === null || value === undefined || value === '' || !Number.isFinite(number) ? '—' : new Intl.NumberFormat('en-US').format(absolute ? Math.abs(number) : number);
};
form.addEventListener('submit', async event => {
  event.preventDefault();
  const code = form.elements.code.value.trim().toUpperCase();
  const button = form.querySelector('button');
  button.disabled = true;
  result.hidden = true;
  status.textContent = 'Loading quote…';
  try {
    const response = await fetch('/stock/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }), cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Quote unavailable.');
    document.querySelector('#stock-name').textContent = data.name || code;
    document.querySelector('#stock-price').textContent = `${amount(data.price, true)} KRW`;
    document.querySelector('#stock-code').textContent = data.code;
    document.querySelector('#stock-change').textContent = amount(data.change);
    document.querySelector('#stock-rate').textContent = data.changeRate == null || data.changeRate === '' ? '—' : `${data.changeRate}%`;
    document.querySelector('#stock-volume').textContent = amount(data.volume, true);
    document.querySelector('#stock-asof').textContent = `Retrieved ${new Date(data.asOf).toLocaleString()} · ${data.mode === 'demo' ? 'Kiwoom demo' : 'Kiwoom live'} environment`;
    status.textContent = '';
    result.hidden = false;
  } catch (error) { status.textContent = error.message || 'Quote unavailable.'; }
  finally { button.disabled = false; }
});
