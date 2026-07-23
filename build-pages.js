/**
 * build-pages.js — Univursyl static site builder
 * Reads: data/articles.json, data/apod.json, data/launches.json
 * Writes: index.html (with live data injected)
 */

import fs   from 'fs/promises';
import path from 'path';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });
}

function readTime(text = '') {
  const words = text.split(' ').length;
  return `${Math.max(2, Math.ceil(words / 200))} min read`;
}

function cardHTML(article, i) {
  const img = article.image
    ? `<img src="${article.image}" alt="${article.title}" class="card-img" loading="lazy" />`
    : `<div class="card-img" style="background:var(--midnight);display:flex;align-items:center;justify-content:center;font-size:36px;">${getCategoryEmoji(article.category)}</div>`;
  return `
<a href="${article.url}" target="_blank" rel="noopener" class="card">
  ${img}
  <div class="card-body">
    <span class="tag">${article.category || 'Science'}</span>
    <h3>${article.title}</h3>
    <p>${article.summary || article.description || ''}</p>
    <div class="card-meta">
      <span>${readTime(article.summary)}</span>
      <span>${formatDate(article.date)}</span>
    </div>
  </div>
</a>`;
}

function getCategoryEmoji(cat = '') {
  const map = {
    'Cosmology': '🌌', 'Astrophysics': '⚛️', 'Exoplanets': '🪐',
    'Black Holes': '🕳️', 'Dark Matter': '💫', 'NASA': '🛸',
    'SpaceX': '🚀', 'Missions': '🛰️', 'Astronomy': '🔭', 'Solar System': '☀️',
  };
  return map[cat] || '🌠';
}

function tickerItems(articles) {
  return articles.slice(0, 12)
    .map(a => `<span>${a.title}</span>`)
    .join('');
}

function nextLaunch(launches) {
  const next = launches[0];
  if (!next) return null;
  return {
    name:     next.name,
    net:      next.net,
    provider: next.provider,
    rocket:   next.rocket,
    pad:      next.pad,
    location: next.location,
  };
}

async function main() {
  const [articlesRaw, apodRaw, launchesRaw, template] = await Promise.all([
    fs.readFile('data/articles.json',  'utf8').catch(() => '{"articles":[]}'),
    fs.readFile('data/apod.json',      'utf8').catch(() => null),
    fs.readFile('data/launches.json',  'utf8').catch(() => '{"launches":[]}'),
    fs.readFile('index.template.html', 'utf8').catch(() => null),
  ]);

  const { articles } = JSON.parse(articlesRaw);
  const apod         = apodRaw ? JSON.parse(apodRaw) : null;
  const { launches } = JSON.parse(launchesRaw);

  if (!template) {
    console.log('ℹ️  No index.template.html — skipping HTML injection');
    return;
  }

  const top3     = articles.slice(0, 3);
  const rest     = articles.slice(3, 9);
  const launch   = nextLaunch(launches);

  let html = template;

  // Ticker
  const ticker = tickerItems(articles) + tickerItems(articles); // doubled for loop
  html = html.replace('<!-- TICKER_ITEMS -->', ticker);

  // Feature cards (top 3 articles)
  const featureCards = top3.map((a, i) => {
    const img = a.image
      ? `<img src="${a.image}" alt="${a.title}" />`
      : `<div style="min-height:${i===0?'480':'240'}px;background:var(--midnight);display:flex;align-items:center;justify-content:center;font-size:48px;">${getCategoryEmoji(a.category)}</div>`;
    const heading = i === 0 ? `<h2>${a.title}</h2><p>${a.summary || ''}</p>` : `<h3>${a.title}</h3>`;
    return `<a href="${a.url}" target="_blank" rel="noopener" class="feature-card">
  ${img}
  <div class="feature-overlay">
    <span class="tag">${a.category || 'Science'}</span>
    ${heading}
    <div class="feature-meta"><span>${readTime(a.summary)}</span><span>·</span><span>${formatDate(a.date)}</span></div>
  </div>
</a>`;
  }).join('\n');
  html = html.replace('<!-- FEATURE_CARDS -->', featureCards);

  // Article cards
  html = html.replace('<!-- ARTICLE_CARDS -->', rest.map(cardHTML).join('\n'));

  // APOD
  if (apod) {
    html = html
      .replace(/<!-- APOD_TITLE -->/g, apod.title)
      .replace(/<!-- APOD_DESC -->/g, apod.explanation)
      .replace(/<!-- APOD_IMG -->/g, apod.url)
      .replace(/<!-- APOD_CREDIT -->/g, `Image Credit: ${apod.copyright}`);
  }

  // Launch countdown
  if (launch) {
    const netFormatted = launch.net
      ? new Date(launch.net).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'TBD';
    html = html
      .replace(/<!-- LAUNCH_NAME -->/g, launch.name)
      .replace(/<!-- LAUNCH_DETAILS -->/g, `${launch.pad || ''} · ${launch.location || ''} · NET ${netFormatted}`)
      .replace(/<!-- LAUNCH_NET -->/g, launch.net || '');
  }

  await fs.writeFile('index.html', html);
  console.log('✅ index.html built successfully');
}

main().catch(e => { console.error(e); process.exit(1); });
