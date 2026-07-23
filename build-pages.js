/**
 * build-pages.js — Univursyl static site builder
 * Reads: data/articles.json, data/videos.json, data/apod.json, data/launches.json
 * Writes: index.html with live data injected
 */

import fs   from 'fs/promises';
import path from 'path';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  } catch { return ''; }
}

function readTime(text = '') {
  return `${Math.max(2, Math.ceil(text.split(' ').length / 200))} min read`;
}

function escHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CATEGORY_COLORS = {
  'Cosmology':   '#C44CFF',
  'Astrophysics':'#4CFFB4',
  'Exoplanets':  '#4C9FFF',
  'Black Holes': '#5B4CFF',
  'Dark Matter': '#4C9FFF',
  'NASA':        '#FF6B4C',
  'SpaceX':      '#D8B45C',
  'Missions':    '#FF6B4C',
  'Astronomy':   '#5B4CFF',
  'Solar System':'#FFD74C',
  'Futurism':    '#FF4C8B',
};

function tagHTML(category) {
  const color = CATEGORY_COLORS[category] || '#5B4CFF';
  return `<span class="tag" style="color:${color};border-color:${color}40">${escHtml(category)}</span>`;
}

function featureCardHTML(article, big = false) {
  const img = article.image
    ? `<div class="feature-img" style="background-image:url('${escHtml(article.image)}')"></div>`
    : `<div class="feature-img" style="background:var(--card-bg)"></div>`;
  const heading = big
    ? `<h2>${escHtml(article.title)}</h2><p>${escHtml(article.summary || article.description || '')}</p>`
    : `<h3>${escHtml(article.title)}</h3>`;
  return `
<a href="${escHtml(article.url)}" target="_blank" rel="noopener" class="feature-card">
  <div class="feature-card-inner">
    ${img}
    <div class="feature-overlay">
      ${tagHTML(article.category || 'Science')}
      ${heading}
      <div class="feature-meta">
        <span>${readTime(article.summary)}</span>
        <span>·</span>
        <span>${formatDate(article.date)}</span>
      </div>
    </div>
  </div>
</a>`;
}

function articleCardHTML(article) {
  return `
<a href="${escHtml(article.url)}" target="_blank" rel="noopener" class="card">
  ${tagHTML(article.category || 'Science')}
  <h3>${escHtml(article.title)}</h3>
  <p>${escHtml(article.summary || article.description || '')}</p>
  <div class="card-meta">
    <span>${readTime(article.summary)}</span>
    <span>${formatDate(article.date)}</span>
  </div>
</a>`;
}

function videoCardHTML(video) {
  return `
<a href="${escHtml(video.url)}" target="_blank" rel="noopener" class="video-card">
  <div class="video-thumb-wrap">
    <img src="${escHtml(video.thumbnail)}" alt="${escHtml(video.title)}" class="video-thumb" loading="lazy"
      onerror="this.src='hero-2.jpg'" />
    <div class="video-play">▶</div>
  </div>
  <div class="video-info">
    <div class="video-channel">${escHtml(video.channel)}</div>
    <div class="video-title">${escHtml(video.title)}</div>
    <div class="video-date">${formatDate(video.date)}</div>
  </div>
</a>`;
}

function tickerHTML(articles) {
  const items = articles.slice(0, 10).map(a =>
    `<span>${escHtml(a.title)}</span>`
  ).join('');
  return items + items; // doubled for seamless loop
}

async function main() {
  const [articlesRaw, videosRaw, apodRaw, launchesRaw, template] = await Promise.all([
    fs.readFile('data/articles.json',  'utf8').catch(() => '{"articles":[]}'),
    fs.readFile('data/videos.json',    'utf8').catch(() => '{"videos":[]}'),
    fs.readFile('data/apod.json',      'utf8').catch(() => null),
    fs.readFile('data/launches.json',  'utf8').catch(() => '{"launches":[]}'),
    fs.readFile('index.template.html', 'utf8').catch(() => null),
  ]);

  if (!template) {
    console.log('ℹ️  No index.template.html — skipping injection');
    return;
  }

  const { articles } = JSON.parse(articlesRaw);
  const { videos }   = JSON.parse(videosRaw);
  const apod         = apodRaw ? JSON.parse(apodRaw) : null;
  const { launches } = JSON.parse(launchesRaw);

  let html = template;

  // Ticker
  html = html.replace('<!-- TICKER_ITEMS -->', tickerHTML(articles));

  // Feature grid — top 3 articles
  const top3 = articles.slice(0, 3);
  const featureHTML = [
    featureCardHTML(top3[0] || {}, true),
    featureCardHTML(top3[1] || {}),
    featureCardHTML(top3[2] || {}),
  ].join('\n');
  html = html.replace('<!-- FEATURE_CARDS -->', featureHTML);

  // Article cards — next 6
  html = html.replace('<!-- ARTICLE_CARDS -->',
    articles.slice(3, 9).map(articleCardHTML).join('\n')
  );

  // Videos
  html = html.replace('<!-- VIDEO_CARDS -->',
    videos.slice(0, 8).map(videoCardHTML).join('\n')
  );

  // APOD
  if (apod) {
    html = html
      .replace('<!-- APOD_TITLE -->',  escHtml(apod.title))
      .replace('<!-- APOD_DESC -->',   escHtml(apod.explanation))
      .replace('<!-- APOD_IMG -->',    escHtml(apod.url))
      .replace('<!-- APOD_CREDIT -->', escHtml(`Image Credit: ${apod.copyright}`));
  }

  // Next launch
  const launch = launches[0];
  if (launch) {
    const net = launch.net
      ? new Date(launch.net).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'TBD';
    html = html
      .replace('<!-- LAUNCH_NAME -->',    escHtml(launch.name))
      .replace('<!-- LAUNCH_DETAILS -->', escHtml(`${launch.pad || ''} · ${launch.location || ''} · NET ${net}`))
      .replace('<!-- LAUNCH_NET -->',     launch.net || '');
  }

  await fs.writeFile('index.html', html);
  console.log(`✅ index.html built — ${articles.length} articles, ${videos.length} videos`);
}

main().catch(e => { console.error(e); process.exit(1); });
