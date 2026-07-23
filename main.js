/* Univursyl — main.js */

// ── HERO ROTATION ─────────────────────────────────────────────
const HERO_SLIDES = [
  {
    image: 'hero-3.jpg',
    label: 'Orion Nebula',
    title: 'A Stellar Nursery<br/>Revealed',
    sub: 'Deep within the Orion Molecular Cloud, thousands of newborn stars ignite for the first time — illuminating one of the most spectacular regions in the night sky.',
  },
  {
    image: 'hero-1.jpg',
    label: 'Milky Way Galaxy',
    title: 'Our Place<br/>in the Cosmos',
    sub: 'The Milky Way contains over 200 billion stars. Our Sun sits in a quiet spiral arm, 26,000 light-years from a supermassive black hole at the galactic center.',
  },
  {
    image: 'hero-2.jpg',
    label: 'The Deep Universe',
    title: 'The Universe,<br/>Explained.',
    sub: 'Every point of light is a star. Every smudge, a galaxy. The observable universe contains an estimated two trillion galaxies — and we are just beginning to understand it.',
  },
];

let currentSlide = 0;
let slideTimer = null;

function setSlide(index, animate = true) {
  const bg      = document.getElementById('hero-bg');
  const label   = document.getElementById('hero-label');
  const title   = document.getElementById('hero-title');
  const sub     = document.getElementById('hero-sub');
  const dots    = document.querySelectorAll('.hero-dot-ind');
  const slide   = HERO_SLIDES[index];

  if (!bg || !slide) return;

  if (animate) {
    bg.style.opacity = '0';
    setTimeout(() => {
      bg.style.backgroundImage = `url('${slide.image}')`;
      bg.style.opacity = '1';
    }, 600);
  } else {
    bg.style.backgroundImage = `url('${slide.image}')`;
  }

  if (label) label.textContent = slide.label;
  if (title) title.innerHTML   = slide.title;
  if (sub)   sub.textContent   = slide.sub;

  dots.forEach((d, i) => d.classList.toggle('active', i === index));
  currentSlide = index;
}

function nextSlide() {
  setSlide((currentSlide + 1) % HERO_SLIDES.length);
}

function initHero() {
  setSlide(0, false);

  // Dot click
  document.querySelectorAll('.hero-dot-ind').forEach(dot => {
    dot.addEventListener('click', () => {
      clearInterval(slideTimer);
      setSlide(parseInt(dot.dataset.index));
      slideTimer = setInterval(nextSlide, 8000);
    });
  });

  slideTimer = setInterval(nextSlide, 8000);
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
    if (diff <= 0) {
      ['cd-days','cd-hours','cd-mins','cd-secs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      return;
    }

    const pad = n => String(Math.floor(n)).padStart(2, '0');
    const d = diff / 86400000;
    const h = (diff % 86400000) / 3600000;
    const m = (diff % 3600000)  / 60000;
    const s = (diff % 60000)    / 1000;

    const days  = document.getElementById('cd-days');
    const hours = document.getElementById('cd-hours');
    const mins  = document.getElementById('cd-mins');
    const secs  = document.getElementById('cd-secs');

    if (days)  days.textContent  = pad(d);
    if (hours) hours.textContent = pad(h);
    if (mins)  mins.textContent  = pad(m);
    if (secs)  secs.textContent  = pad(s);
  }

  update();
  setInterval(update, 1000);
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initHero();
  initNav();
  initCountdown();
});
