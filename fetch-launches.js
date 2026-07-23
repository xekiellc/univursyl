/**
 * fetch-launches.js — upcoming rocket launches
 * Source: Launch Library 2 (free, no key required)
 * Writes: data/launches.json
 */

import fetch from 'node-fetch';
import fs    from 'fs/promises';
import path  from 'path';

async function main() {
  const url = 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?format=json&limit=10&ordering=net';

  let launches = [];
  try {
    const res  = await fetch(url, { headers: { 'User-Agent': 'Univursyl/1.0' } });
    const data = await res.json();
    launches = (data.results || []).map(l => ({
      id:          l.id,
      name:        l.name,
      net:         l.net,          // NET (No Earlier Than) timestamp
      status:      l.status?.abbrev,
      provider:    l.launch_service_provider?.name,
      rocket:      l.rocket?.configuration?.name,
      pad:         l.pad?.name,
      location:    l.pad?.location?.name,
      mission:     l.mission?.name,
      description: l.mission?.description,
      image:       l.image,
    }));
    console.log(`✅ ${launches.length} upcoming launches`);
  } catch (e) {
    console.warn('Launch Library failed:', e.message);
  }

  const outPath = path.join(process.cwd(), 'data', 'launches.json');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify({
    generated: new Date().toISOString(),
    launches,
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
