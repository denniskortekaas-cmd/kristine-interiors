#!/usr/bin/env node
/**
 * Instagram competitor reel scraper for Kristine Interiors
 * Uses Apify's instagram-scraper to pull reels from Dubai interior design competitors
 * and surfaces the viral ones sorted by view count.
 */

const fs = require('fs');
const path = require('path');

// Load project-local .env
const envVars = Object.fromEntries(
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const APIFY_TOKEN = envVars.APIFY_API_TOKEN;
const ACTOR_ID = 'apify~instagram-scraper';

// Dubai interior design competitor accounts
const COMPETITORS = [
  'musedesign.ae',          // Muse Design — luxury Dubai, 47K followers
  'ol_interior_dubai',      // OL Interior Dubai
  'sakinakaradesign',       // Sakina Kara Design — UAE interior designer
  'katrina.antonovich.official', // Antonovich Design — high-end luxury
  'hosskianii',             // Top home decor influencer Dubai
  'njn_designs',            // Dubai interior designer
  'antonovichdesign',       // Antonovich Design Dubai
  'interiorsbycollins',     // Interior Design Dubai
];

const RESULTS_PER_ACCOUNT = 30; // reels to pull per account

async function runActor(usernames) {
  const directUrls = usernames.map(u => `https://www.instagram.com/${u}/`);

  const body = {
    directUrls,
    resultsType: 'posts',
    resultsLimit: RESULTS_PER_ACCOUNT,
    searchType: 'user',
    searchLimit: 1,
    addParentData: true,
  };

  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&waitForFinish=300`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(`Actor start failed: ${JSON.stringify(data)}`);

  return data.data;
}

async function getDatasetItems(datasetId) {
  const res = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=1000`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Dataset fetch failed: ${JSON.stringify(data)}`);
  return data;
}

async function waitForRun(runId) {
  const maxWait = 15 * 60 * 1000; // 15 min
  const interval = 10_000;
  const start = Date.now();

  process.stdout.write('Waiting for Apify run to finish');

  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, interval));
    process.stdout.write('.');

    const res = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const data = await res.json();
    const status = data.data?.status;

    if (status === 'SUCCEEDED') {
      console.log(' done!\n');
      return data.data.defaultDatasetId;
    }
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Run ended with status: ${status}`);
    }
  }
  throw new Error('Timed out waiting for Apify run');
}

function formatNumber(n) {
  if (!n && n !== 0) return 'N/A';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function truncate(str, len = 80) {
  if (!str) return '';
  const clean = str.replace(/\n/g, ' ').trim();
  return clean.length > len ? clean.slice(0, len) + '…' : clean;
}

async function main() {
  console.log('=== Kristine Interiors — Dubai Competitor Reel Spy ===\n');
  console.log(`Scraping ${COMPETITORS.length} accounts, ${RESULTS_PER_ACCOUNT} posts each...\n`);

  // Start the actor run
  let run;
  try {
    run = await runActor(COMPETITORS);
    console.log(`Run started: ${run.id} (status: ${run.status})`);
  } catch (err) {
    console.error('Failed to start actor:', err.message);
    process.exit(1);
  }

  // If run didn't finish in the waitForFinish window, poll for it
  let datasetId = run.defaultDatasetId;
  if (run.status !== 'SUCCEEDED') {
    try {
      datasetId = await waitForRun(run.id);
    } catch (err) {
      console.error('Run failed:', err.message);
      process.exit(1);
    }
  } else {
    console.log('Run finished immediately.\n');
  }

  // Fetch results
  console.log('Fetching scraped data...');
  const items = await getDatasetItems(datasetId);
  console.log(`Total posts fetched: ${items.length}\n`);

  // Filter for video/reels only
  const reels = items.filter(p =>
    p.type === 'Video' ||
    p.productType === 'clips' ||
    p.isVideo === true ||
    (p.videoViewCount && p.videoViewCount > 0)
  );

  console.log(`Video posts (reels) found: ${reels.length}\n`);

  if (reels.length === 0) {
    console.log('No reels found. Raw sample:');
    console.log(JSON.stringify(items[0], null, 2));
    return;
  }

  // Sort by view count descending
  reels.sort((a, b) => (b.videoViewCount || 0) - (a.videoViewCount || 0));

  // Print top 20
  const top = reels.slice(0, 20);

  console.log('=== TOP 20 VIRAL REELS FROM DUBAI INTERIOR DESIGN COMPETITORS ===\n');
  console.log(
    `${'#'.padEnd(3)} ${'Account'.padEnd(30)} ${'Views'.padEnd(8)} ${'Likes'.padEnd(8)} ${'Comments'.padEnd(8)} Caption`
  );
  console.log('─'.repeat(140));

  top.forEach((reel, i) => {
    const account = reel.ownerUsername || reel.username || '?';
    const views = formatNumber(reel.videoViewCount);
    const likes = formatNumber(reel.likesCount);
    const comments = formatNumber(reel.commentsCount);
    const caption = truncate(reel.caption, 60);
    const url = reel.url || reel.shortCode ? `https://www.instagram.com/reel/${reel.shortCode}/` : '';

    console.log(
      `${String(i + 1).padEnd(3)} ${account.padEnd(30)} ${views.padEnd(8)} ${likes.padEnd(8)} ${comments.padEnd(8)} ${caption}`
    );
    if (url) console.log(`${''.padEnd(3)} ${url}`);
  });

  // Summary by account
  console.log('\n=== ENGAGEMENT SUMMARY BY ACCOUNT ===\n');
  const byAccount = {};
  reels.forEach(r => {
    const acc = r.ownerUsername || r.username || 'unknown';
    if (!byAccount[acc]) byAccount[acc] = { reels: 0, totalViews: 0, topViews: 0 };
    byAccount[acc].reels++;
    byAccount[acc].totalViews += r.videoViewCount || 0;
    byAccount[acc].topViews = Math.max(byAccount[acc].topViews, r.videoViewCount || 0);
  });

  const sorted = Object.entries(byAccount).sort((a, b) => b[1].topViews - a[1].topViews);
  console.log(`${'Account'.padEnd(30)} ${'Reels'.padEnd(8)} ${'Avg Views'.padEnd(12)} ${'Top Reel'}`);
  console.log('─'.repeat(70));
  sorted.forEach(([acc, stats]) => {
    const avg = stats.reels > 0 ? Math.round(stats.totalViews / stats.reels) : 0;
    console.log(
      `${acc.padEnd(30)} ${String(stats.reels).padEnd(8)} ${formatNumber(avg).padEnd(12)} ${formatNumber(stats.topViews)}`
    );
  });

  console.log('\nDone. Use the viral reels above as inspiration for Kristine\'s content strategy.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
