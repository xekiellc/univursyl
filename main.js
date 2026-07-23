/* Univursyl — main.js */

// ── CINEMATIC INTRO ───────────────────────────────────────────
const INTRO_IMAGES   = ['hero-3.jpg'];
const INTRO_DURATION = 2000;
const INTRO_FADE     = 600;

function runIntro() {
  return new Promise(resolve => {
    const overlay  = document.getElementById('intro-overlay');
    const img      = document.getElementById('intro-img');
    const wordmark = document.getElementById('intro-wordmark');
    if (!overlay || !img) { resolve(); return; }
    if (wordmark) wordmark.style.display = 'none';

    img.style.transition = 'none';
    img.style.opacity    = '0';
    img.src              = 'hero-3.jpg';

    const show = () => {
      img.style.transition = `opacity ${INTRO_FADE}ms ease`;
      img.style.opacity    = '1';
      setTimeout(() => {
        overlay.style.transition = `opacity ${INTRO_FADE}ms ease`;
        overlay.style.opacity    = '0';
        setTimeout(() => {
          overlay.style.display = 'none';
          resolve();
        }, INTRO_FADE);
      }, INTRO_DURATION);
    };

    if (img.complete && img.naturalWidth) { show(); }
    else { img.onload = show; img.onerror = () => { overlay.style.display = 'none'; resolve(); }; }
  });
}

// ── VIDEO THUMBNAIL REPAIR ────────────────────────────────────
function repairThumb(imgEl) {
  const videoId = imgEl.dataset.videoid;
  if (!videoId) return;

  const sizes = ['hqdefault', 'mqdefault', 'sddefault', 'default'];
  let idx = 0;

  const tryNext = () => {
    if (idx >= sizes.length) {
      imgEl.style.display = 'none';
      return;
    }
    imgEl.src = `https://i.ytimg.com/vi/${videoId}/${sizes[idx]}.jpg`;
    idx++;
  };

  imgEl.onerror = tryNext;
  tryNext();
}

function initVideoThumbs() {
  document.querySelectorAll('.video-thumb[data-videoid]').forEach(repairThumb);
}

// ── NAV SCROLL ────────────────────────────────────────────────
function initNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });
}

// ── LAUNCH COUNTDOWN ──────────────────────────────────────────
function initCountdown() {
  const launch = new Date('2026-07-26T18:00:00Z');

  function update() {
    const diff = launch - new Date();
    const pad  = n => String(Math.floor(n)).padStart(2, '0');
    if (diff <= 0) {
      ['cd-days','cd-hours','cd-mins','cd-secs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      return;
    }
    const days  = document.getElementById('cd-days');
    const hours = document.getElementById('cd-hours');
    const mins  = document.getElementById('cd-mins');
    const secs  = document.getElementById('cd-secs');
    if (days)  days.textContent  = pad(diff / 86400000);
    if (hours) hours.textContent = pad((diff % 86400000) / 3600000);
    if (mins)  mins.textContent  = pad((diff % 3600000)  / 60000);
    if (secs)  secs.textContent  = pad((diff % 60000)    / 1000);
  }
  update();
  setInterval(update, 1000);
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await runIntro();
  initNav();
  initCountdown();
  initVideoThumbs();
});
