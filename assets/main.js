// InsightnWisdom — shared site behavior (no framework, no build step)
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      toggle.textContent = isOpen ? '✕' : '☰';
    });

    // Close mobile menu when a plain link is tapped
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
      });
    });
  }

  // Close any open <details> nav dropdown when clicking outside it (desktop)
  document.addEventListener('click', function (e) {
    document.querySelectorAll('.nav-dropdown[open]').forEach(function (d) {
      if (!d.contains(e.target)) d.removeAttribute('open');
    });
  });

  // Contact / RFQ form: submits to ben@insnwiz.com via FormSubmit's AJAX endpoint.
  // The first submission triggers a one-time activation email to that inbox.
  var form = document.querySelector('#rfq-form');
  if (form) {
    var ENDPOINT = 'https://formsubmit.co/ajax/ben@insnwiz.com';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      var btn = form.querySelector('button[type="submit"]');
      function show(msg, ok) {
        if (!status) return;
        status.textContent = msg;
        status.style.display = 'block';
        status.style.color = ok ? '#0b5d3b' : '#8a6a00';
        status.style.background = ok ? '#e8f7f0' : '#fff7e6';
        status.style.borderColor = ok ? '#a9dfc6' : '#f0d999';
      }
      var name = form.querySelector('[name="name"]');
      var email = form.querySelector('[name="email"]');
      if (!name.value.trim() || !email.value.trim() || !email.checkValidity()) {
        show('Please enter your name and a valid email address.', false);
        return;
      }
      var data = new FormData(form);
      data.append('_subject', 'New enquiry from insnwiz.com');
      data.append('_template', 'table');
      data.append('_captcha', 'false');
      if (btn) { btn.disabled = true; }
      show('Sending…', false);
      fetch(ENDPOINT, { method: 'POST', headers: { 'Accept': 'application/json' }, body: data })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
        .then(function (res) {
          if (res.ok && String(res.body.success) === 'true') {
            form.reset();
            show('Thank you — your message has been sent. We will get back to you shortly.', true);
          } else {
            show('Sorry, the message could not be sent. Please email ben@insnwiz.com directly.', false);
          }
        })
        .catch(function () {
          show('Sorry, the message could not be sent. Please email ben@insnwiz.com directly.', false);
        })
        .then(function () { if (btn) { btn.disabled = false; } });
    });
  }
});
