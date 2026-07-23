/**
 * fetch-news.js — Univursyl content pipeline
 * Sources: NewsAPI + curated RSS feeds
 * Filters: Claude Haiku (relevance + quality scoring)
 * Writes: data/articles.json
 */

import Anthropic from '@anthropic-ai/sdk';
import fetch     from 'node-fetch';
import Parser    from 'rss-parser';
import fs        from 'fs/promises';
import path      from 'path';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });
const parser    = new Parser();

// ── TOPIC CATEGORIES ─────────────────────────────────────────
const CATEGORIES = [
  { name: 'Cosmology',    emoji: '🌌' },
  { name: 'Astrophysics', emoji: '⚛️' },
  { name: 'Exoplanets',   emoji: '🪐' },
  { name: 'Black Holes',  emoji: '🕳️' },
  { name: 'Dark Matter',  emoji: '💫' },
  { name: 'NASA',         emoji: '🛸' },
  { name: 'SpaceX',       emoji: '🚀' },
  { name: 'Missions',     emoji: '🛰️' },
  { name: 'Astronomy',    emoji: '🔭' },
  { name: 'Solar System', emoji: '☀️' },
];

// ── RSS SOURCES ───────────────────────────────────────────────
const RSS_FEEDS = [
  'https://www.nasa.gov/rss/dyn/breaking_news.rss',
  'https://www.nasa.gov/rss/dyn/solar_system.rss',
  'https://www.esa.int/rssfeed/Our_Activities/Space_Science',
  'https://feeds.spacenews.com/SpaceNews/news',
  'https://www.skyandtelescope.com/feed/',
  'https://www.universetoday.com/feed/',
  'https://www.spacedaily.com/spacedaily.xml',
  'https://phys.org/rss-feed/space-news/',
  'https://www.sciencedaily.com/rss/space_time.xml',
  'https://blogs.nasa.gov/webb/feed/',
];

// ── NEWSAPI KEYWORDS ──────────────────────────────────────────
const NEWS_QUERIES = [
  'astronomy discovery 2026',
  'NASA mission 2026',
  'SpaceX rocket launch',
  'James Webb telescope discovery',
  'exoplanet habitable zone',
  'black hole discovery',
  'dark matter cosmology',
  'astrophysics breakthrough',
];

async function fetchRSS() {
  const items = [];
  for (const url of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(url);
      for (const item of (feed.items || []).slice(0, 10)) {
        items.push({
          title:       item.title       || '',
          description: item.contentSnippet || item.summary || '',
          url:         item.link        || '',
          source:      feed.title       || url,
          date:        item.pubDate     || item.isoDate || new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn(`RSS failed: ${url} — ${e.message}`);
    }
  }
  return items;
}

async function fetchNewsAPI() {
  const items = [];
  if (!process.env.NEWS_API_KEY) return items;

  for (const q of NEWS_QUERIES.slice(0, 3)) {
    try {
      const url  = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&sortBy=publishedAt&pageSize=10&apiKey=${process.env.NEWS_API_KEY}`;
      const res  = await fetch(url);
      const data = await res.json();
      for (const a of (data.articles || [])) {
        items.push({
          title:       a.title       || '',
          description: a.description || '',
          url:         a.url         || '',
          source:      a.source?.name || 'NewsAPI',
          date:        a.publishedAt || new Date().toISOString(),
          image:       a.urlToImage  || null,
        });
      }
    } catch (e) {
      console.warn(`NewsAPI failed: ${q} — ${e.message}`);
    }
  }
  return items;
}

async function categorizeAndFilter(articles) {
  // Deduplicate
  const seen = new Set();
  const unique = articles.filter(a => {
    const key = a.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const batch = unique.slice(0, 60);
  const prompt = `You are the editorial AI for Univursyl, a premium space science publication.

Below are ${batch.length} articles. For each, return JSON with:
- index (0-based)
- include (true/false) — only true for real space/astronomy/astrophysics/cosmology/exoplanet/NASA/SpaceX content
- category — one of: ${CATEGORIES.map(c => c.name).join(', ')}
- quality (1-5) — 5 = major scientific discovery or landmark mission; 1 = minor/routine
- summary — 1-2 sentence plain-English summary for non-specialist readers

Exclude: opinion pieces, non-science business news, duplicate events.

Articles:
${batch.map((a, i) => `[${i}] ${a.title}\n${a.description?.slice(0, 120)}`).join('\n\n')}

Return ONLY a JSON array, no markdown.`;

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages:   [{ role: 'user', content: prompt }],
    });
    const raw     = msg.content[0].text.replace(/```json|```/g, '').trim();
    const ratings = JSON.parse(raw);

    return ratings
      .filter(r => r.include && r.quality >= 3)
      .sort((a, b) => b.quality - a.quality)
      .slice(0, 30)
      .map(r => ({
        ...batch[r.index],
        category: r.category,
        quality:  r.quality,
        summary:  r.summary,
      }));
  } catch (e) {
    console.error('Claude filtering failed:', e.message);
    return batch.slice(0, 20);
  }
}

async function main() {
  console.log('📡 Fetching RSS feeds...');
  const rss  = await fetchRSS();

  console.log('📰 Fetching NewsAPI...');
  const news = await fetchNewsAPI();

  const all = [...rss, ...news];
  console.log(`  ${all.length} raw articles`);

  console.log('🤖 Categorizing with Claude Haiku...');
  const filtered = await categorizeAndFilter(all);
  console.log(`  ${filtered.length} articles passed`);

  const outPath = path.join(process.cwd(), 'data', 'articles.json');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify({
    generated: new Date().toISOString(),
    count:     filtered.length,
    articles:  filtered,
  }, null, 2));

  console.log(`✅ Wrote ${filtered.length} articles to data/articles.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
