/**
 * fetch-apod.js — NASA Astronomy Picture of the Day
 * Writes: data/apod.json
 */

import Anthropic from '@anthropic-ai/sdk';
import fetch     from 'node-fetch';
import fs        from 'fs/promises';
import path      from 'path';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });
const NASA_KEY  = process.env.NASA_API_KEY || 'DEMO_KEY';

async function main() {
  const url = `https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`;
  const res  = await fetch(url);
  const data = await res.json();

  // Claude generates an accessible, engaging caption
  let caption = data.explanation;
  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role:    'user',
        content: `Rewrite this NASA APOD explanation in 2 engaging sentences for a general science audience. Be specific and vivid. No jargon without explanation.\n\n${data.explanation}`,
      }],
    });
    caption = msg.content[0].text.trim();
  } catch (e) {
    console.warn('Claude caption failed, using original');
  }

  const out = {
    title:       data.title,
    date:        data.date,
    url:         data.url,
    hdurl:       data.hdurl || data.url,
    media_type:  data.media_type,
    explanation: caption,
    copyright:   data.copyright || 'NASA',
  };

  const outPath = path.join(process.cwd(), 'data', 'apod.json');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2));
  console.log(`✅ APOD: ${out.title}`);
}

main().catch(e => { console.error(e); process.exit(1); });
