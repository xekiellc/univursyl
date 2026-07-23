/* Univursyl — main.js */

// ── LAUNCH COUNTDOWN ──────────────────────────────────────────
function initCountdown() {
  // Example: next Falcon 9 launch (placeholder — replace with live data)
  const launchDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000);

  function update() {
    const now  = new Date();
    const diff = launchDate - now;
    if (diff <= 0) {
      document.getElementById('cd-days').textContent  = '00';
      document.getElementById('cd-hours').textContent = '00';
      document.getElementById('cd-mins').textContent  = '00';
      document.getElementById('cd-secs').textContent  = '00';
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('cd-days').textContent  = pad(d);
    document.getElementById('cd-hours').textContent = pad(h);
    document.getElementById('cd-mins').textContent  = pad(m);
    document.getElementById('cd-secs').textContent  = pad(s);
  }
  update();
  setInterval(update, 1000);
}

// ── NAV SCROLL ────────────────────────────────────────────────
function initNav() {
  const nav = document.querySelector('nav');
  window.addEventListener('scroll', () => {
    nav.style.background = window.scrollY > 60
      ? 'rgba(6,7,10,0.97)'
      : 'rgba(6,7,10,0.88)';
  }, { passive: true });
}

// ── TICKER DUPLICATE ─────────────────────────────────────────
function initTicker() {
  const track = document.querySelector('.ticker-track');
  if (!track) return;
  // Clone for seamless loop
  track.innerHTML += track.innerHTML;
}

// ── NEWSLETTER FORM ───────────────────────────────────────────
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value;
    const btn   = form.querySelector('button');
    btn.textContent = 'Subscribed ✓';
    btn.style.background = '#2a9d5c';
    btn.disabled = true;
    console.log('Newsletter signup:', email);
  });
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initNav();
  initTicker();
  initNewsletter();
});
