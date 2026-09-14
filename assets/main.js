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

  // Basic client-side check for the RFQ/contact form (no backend wired yet —
  // see README "Wiring the contact form" before launch).
  var form = document.querySelector('#rfq-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      if (status) {
        status.textContent = 'This form is not yet connected to a submission endpoint. See README.md ("Wiring the contact form") to connect it to email, a CRM, or a Cloudflare Pages Function before launch.';
        status.style.display = 'block';
      }
    });
  }
});
