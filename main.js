/* Univursyl — main.js */

// ── CINEMATIC INTRO ───────────────────────────────────────────
const INTRO_IMAGES = ['hero-1.jpg', 'hero-2.jpg', 'hero-3.jpg'];
const INTRO_DURATION = 800;   // ms each image shows
const INTRO_FADE     = 400;   // ms fade transition

function runIntro() {
  return new Promise(resolve => {
    const overlay = document.getElementById('intro-overlay');
    const img     = document.getElementById('intro-img');
    if (!overlay || !img) { resolve(); return; }

    let i = 0;

    function showNext() {
      if (i >= INTRO_IMAGES.length) {
        // Fade out entire overlay
        overlay.style.transition = `opacity ${INTRO_FADE}ms ease`;
        overlay.style.opacity    = '0';
        setTimeout(() => {
          overlay.style.display = 'none';
          resolve();
        }, INTRO_FADE);
        return;
      }

      img.style.opacity    = '0';
      img.style.transition = 'none';
      img.src              = INTRO_IMAGES[i];

      img.onload = () => {
        // Fade in
        img.style.transition = `opacity ${INTRO_FADE}ms ease`;
        img.style.opacity    = '1';

        setTimeout(() => {
          // Fade out
          img.style.opacity = '0';
          setTimeout(() => {
            i++;
            showNext();
          }, INTRO_FADE);
        }, INTRO_DURATION);
      };

      // In case image already cached
      if (img.complete && img.naturalWidth) {
        img.onload();
      }
    }

    showNext();
  });
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

// ── VIDEO THUMBNAIL FALLBACK ───────────────────────────────────
function initVideoThumbs() {
  document.querySelectorAll('.video-thumb').forEach(img => {
    img.addEventListener('error', function() {
      const src = this.src;
      if (src.includes('maxresdefault')) {
        this.src = src.replace('maxresdefault', 'hqdefault');
      } else if (src.includes('hqdefault')) {
        this.src = src.replace('hqdefault', 'mqdefault');
      }
    });
  });
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await runIntro();
  initNav();
  initCountdown();
  initVideoThumbs();
});
