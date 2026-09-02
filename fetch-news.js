/**
 * fetch-news.js — Univursyl content pipeline
 * Sources: NewsAPI + RSS feeds + YouTube
 * Filters: Claude Haiku (relevance + quality scoring)
 * Writes: data/articles.json, data/videos.json
 */

import Anthropic from '@anthropic-ai/sdk';
import fetch     from 'node-fetch';
import Parser    from 'rss-parser';
import fs        from 'fs/promises';
import path      from 'path';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });
const parser    = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; UnivursylBot/1.0; +https://univursyl.com)',
  },
});

const CATEGORIES = [
  'Cosmology', 'Astrophysics', 'Exoplanets', 'Black Holes',
  'Dark Matter', 'NASA', 'SpaceX', 'Missions', 'Astronomy', 'Solar System', 'Futurism'
];

// Removed: nasa.gov solar_system.rss (404), feeds.spacenews.com (DNS dead),
// blogs.nasa.gov/webb (malformed XML — unescaped entities break the parser)
const RSS_FEEDS = [
  'https://www.nasa.gov/rss/dyn/breaking_news.rss',
  'https://www.esa.int/rssfeed/Our_Activities/Space_Science',
  'https://www.skyandtelescope.com/feed/',
  'https://www.universetoday.com/feed/',
  'https://phys.org/rss-feed/space-news/',
  'https://www.sciencedaily.com/rss/space_time.xml',
  'https://www.space.com/feeds/all',
];

const NEWS_QUERIES = [
  'astronomy discovery 2026',
  'NASA mission 2026',
  'SpaceX rocket launch 2026',
  'James Webb telescope discovery',
  'exoplanet habitable zone',
  'black hole discovery 2026',
  'dark matter cosmology',
  'astrophysics breakthrough 2026',
  'space exploration 2026',
  'Michio Kaku space',
];

// YouTube channels for our Voices section
const YOUTUBE_CHANNELS = [
  { id: 'UCLA_DiR1FfKNvjuUpBHmylQ', name: 'NASA'                    },
  { id: 'UCSUu1lih2RifWkKtDOJdsBA', name: 'SpaceX'                  },
  { id: 'UCVTomc35agH1SM6kCKzwW_g', name: 'Anton Petrov'            },
  { id: 'UC1znqKFL3jeR0eoA0pHpzvw', name: 'Scott Manley'            },
  { id: 'UCxzC4EngIsMrPmbm6Nxvb-A', name: 'Everyday Astronaut'      },
  { id: 'UC7_gcs09iThXybpVgjHZ_7g', name: 'PBS Space Time'          },
  { id: 'UCZFipeZtQM5CKUjx6grh54g', name: 'Isaac Arthur'            },
  { id: 'UCoOjH4eqCulXnLs44YHNR_w', name: 'Michio Kaku'            },
  { id: 'UCIeBxFbKzE0GqhgwARQCrCw', name: 'Brian Cox'               },
];

async function fetchRSS() {
  const items = [];
  for (const url of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(url);
      for (const item of (feed.items || []).slice(0, 8)) {
        items.push({
          title:       item.title || '',
          description: item.contentSnippet || item.summary || '',
          url:         item.link || '',
          source:      feed.title || url,
          date:        item.pubDate || item.isoDate || new Date().toISOString(),
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
  for (const q of NEWS_QUERIES.slice(0, 4)) {
    try {
      const url  = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&sortBy=publishedAt&pageSize=10&apiKey=${process.env.NEWS_API_KEY}`;
      const res  = await fetch(url);
      const data = await res.json();
      for (const a of (data.articles || [])) {
        items.push({
          title:       a.title || '',
          description: a.description || '',
          url:         a.url || '',
          source:      a.source?.name || 'NewsAPI',
          date:        a.publishedAt || new Date().toISOString(),
          image:       a.urlToImage || null,
        });
      }
    } catch (e) {
      console.warn(`NewsAPI failed: ${q} — ${e.message}`);
    }
  }
  return items;
}

async function fetchYouTubeVideos() {
  const videos = [];
  if (!process.env.YOUTUBE_API_KEY) return videos;

  for (const channel of YOUTUBE_CHANNELS) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?key=${process.env.YOUTUBE_API_KEY}&channelId=${channel.id}&part=snippet&order=date&maxResults=3&type=video&q=space+astronomy+universe`;
      const res  = await fetch(url);
      const data = await res.json();

      for (const item of (data.items || [])) {
        const videoId = item.id?.videoId;
        if (!videoId) continue;
        videos.push({
          videoId,
          title:       item.snippet?.title || '',
          description: item.snippet?.description || '',
          channel:     channel.name,
          channelId:   channel.id,
          date:        item.snippet?.publishedAt || new Date().toISOString(),
          thumbnail:   `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          url:         `https://www.youtube.com/watch?v=${videoId}`,
        });
      }
    } catch (e) {
      console.warn(`YouTube failed: ${channel.name} — ${e.message}`);
    }
  }

  return videos;
}

// Split into small chunks so Claude's JSON response can never get long enough to truncate
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function filterChunk(chunk, offset) {
  const prompt = `You are the editorial AI for Univursyl, a premium space science publication covering astronomy, cosmology, astrophysics, exoplanets, NASA, SpaceX, dark matter, black holes, solar system, and futurism. Tone: positive, inspiring, wonder-driven. No negative stories.

For each article below return JSON:
- index (0-based, matching the number in brackets)
- include (true/false) — true only for positive space/science content
- category — one of: ${CATEGORIES.join(', ')}
- quality (1-5) — 5=major discovery or landmark mission
- summary — 1-2 sentence plain-English summary

Exclude: negative news, politics, non-space content, duplicates.

Articles:
${chunk.map((a, i) => `[${i}] ${a.title}\n${a.description?.slice(0, 120)}`).join('\n\n')}

Return ONLY a JSON array, no markdown, no explanation.`;

  const msg = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages:   [{ role: 'user', content: prompt }],
  });
  const raw     = msg.content[0].text.replace(/```json|```/g, '').trim();
  const ratings = JSON.parse(raw);

  return ratings
    .filter(r => r.include && r.quality >= 3)
    .map(r => ({ ...chunk[r.index], category: r.category, quality: r.quality, summary: r.summary }));
}

async function categorizeAndFilter(articles) {
  const seen   = new Set();
  const unique = articles.filter(a => {
    const key = a.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const batch  = unique.slice(0, 60);
  const chunks = chunkArray(batch, 15); // small enough that 4000 tokens is never a bottleneck

  let results     = [];
  let failedChunks = 0;

  for (let i = 0; i < chunks.length; i++) {
    try {
      const filtered = await filterChunk(chunks[i], i * 15);
      results = results.concat(filtered);
    } catch (e) {
      failedChunks++;
      console.error(`Claude filtering failed on chunk ${i + 1}/${chunks.length}:`, e.message);
    }
  }

  // If every chunk failed, we have nothing trustworthy to publish — fail loudly
  // instead of silently re-publishing old/incomplete content.
  if (chunks.length > 0 && failedChunks === chunks.length) {
    throw new Error('All Claude filtering chunks failed — refusing to publish unfiltered content.');
  }

  return results
    .sort((a, b) => b.quality - a.quality)
    .slice(0, 30);
}

async function main() {
  console.log('📡 Fetching RSS...');
  const rss = await fetchRSS();

  console.log('📰 Fetching NewsAPI...');
  const news = await fetchNewsAPI();

  console.log('🎬 Fetching YouTube...');
  const videos = await fetchYouTubeVideos();

  const all = [...rss, ...news];
  console.log(`  ${all.length} raw articles, ${videos.length} videos`);

  console.log('🤖 Filtering with Claude Haiku...');
  const filtered = await categorizeAndFilter(all);
  console.log(`  ${filtered.length} articles passed`);

  if (filtered.length === 0) {
    throw new Error('No articles passed filtering — refusing to overwrite existing content with an empty set.');
  }

  await fs.mkdir('data', { recursive: true });

  await fs.writeFile('data/articles.json', JSON.stringify({
    generated: new Date().toISOString(),
    count:     filtered.length,
    articles:  filtered,
  }, null, 2));

  await fs.writeFile('data/videos.json', JSON.stringify({
    generated: new Date().toISOString(),
    count:     videos.length,
    videos,
  }, null, 2));

  console.log(`✅ Done — ${filtered.length} articles, ${videos.length} videos`);
}

main().catch(e => { console.error(e); process.exit(1); });
