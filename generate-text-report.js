const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'scraped_data.json'), 'utf8'));
const posts = data.filter(d => d.shortCode && d.type);
const reels = posts.filter(p => p.type === 'Video' || p.productType === 'clips' || (p.videoViewCount && p.videoViewCount > 0));

function fmt(n) {
  if (!n && n !== 0) return 'N/A';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function fmtDate(ts) {
  if (!ts) return 'N/A';
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const accountNotes = {
  'musedesign.ae': 'Luxury Dubai firm — villa/apt walkthroughs, highest view counts',
  'katrina.antonovich.official': 'Ultra-high likes (12-14K per reel), smaller but very engaged audience',
  'ol_interior_dubai': 'Russian-language renovation vlogs, 27 reels scraped',
  'hosskianii': 'Real estate + lifestyle hybrid, casual tone, high reel frequency',
  'sakinakaradesign': 'UAE-based designer, lower posting frequency',
  'interiorsbycollins': 'Very limited data — only 7 posts scraped',
  '2088.real.estate': 'Real estate agency crossover account',
  'moroz.lor': 'Minimal posts in dataset',
};

const accounts = {};
posts.forEach(p => {
  const u = p.ownerUsername;
  if (!accounts[u]) accounts[u] = { posts: [], reels: [] };
  accounts[u].posts.push(p);
  if (p.type === 'Video' || p.productType === 'clips') accounts[u].reels.push(p);
});

const sortedAccounts = Object.entries(accounts).sort((a, b) => {
  const aTop = a[1].reels.length ? Math.max(...a[1].reels.map(x => x.videoViewCount || 0)) : 0;
  const bTop = b[1].reels.length ? Math.max(...b[1].reels.map(x => x.videoViewCount || 0)) : 0;
  return bTop - aTop;
});

let out = '';
const line = (s = '') => { out += s + '\n'; };
const div = (char = '─', len = 100) => line(char.repeat(len));
const section = (title) => { line(); div('═'); line(title.toUpperCase()); div('═'); line(); };

line('KRISTINE INTERIORS — DUBAI COMPETITOR INSTAGRAM ANALYSIS');
line(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`);
line(`Accounts scraped: 8  |  Total posts: ${posts.length}  |  Reels: ${reels.length}  |  Photos: ${posts.length - reels.length}`);
line('Competitor research for @kristine.interiors (Japandi interior designer, Dubai UAE)');

// ── 1. Account Summary ───────────────────────────────────────
section('1. Account Performance Summary');

line('Account                          Posts  Reels  Avg Views  Top Reel   Avg Likes  Notes');
div();

sortedAccounts.forEach(([u, acc]) => {
  const r = acc.reels;
  const avgViews = r.length ? Math.round(r.reduce((s, x) => s + (x.videoViewCount || 0), 0) / r.length) : 0;
  const topViews = r.length ? Math.max(...r.map(x => x.videoViewCount || 0)) : 0;
  const avgLikes = acc.posts.length ? Math.round(acc.posts.reduce((s, x) => s + (x.likesCount || 0), 0) / acc.posts.length) : 0;
  const col1 = `@${u}`.padEnd(33);
  const col2 = String(acc.posts.length).padEnd(7);
  const col3 = String(r.length).padEnd(7);
  const col4 = fmt(avgViews).padEnd(11);
  const col5 = fmt(topViews).padEnd(11);
  const col6 = fmt(avgLikes).padEnd(11);
  const note = (accountNotes[u] || '').slice(0, 50);
  line(`${col1}${col2}${col3}${col4}${col5}${col6}${note}`);
});

// ── 2. Top 20 Viral Reels ────────────────────────────────────
section('2. Top 20 Viral Reels (Ranked by Views)');

const topReels = [...reels].sort((a, b) => (b.videoViewCount || 0) - (a.videoViewCount || 0)).slice(0, 20);
topReels.forEach((r, i) => {
  line(`#${i + 1}  @${r.ownerUsername}`);
  line(`     Views: ${fmt(r.videoViewCount)}  |  Likes: ${fmt(r.likesCount)}  |  Comments: ${fmt(r.commentsCount)}  |  Date: ${fmtDate(r.timestamp)}`);
  line(`     URL: ${r.url}`);
  if (r.caption) {
    line(`     Caption: ${r.caption.replace(/\n/g, ' ')}`);
  }
  if (r.hashtags && r.hashtags.length > 0) {
    line(`     Hashtags: ${r.hashtags.map(h => '#' + h).join('  ')}`);
  }
  line();
});

// ── 3. All Reels Per Account ─────────────────────────────────
section('3. All Reels — Full Data by Account');

sortedAccounts.forEach(([u, acc]) => {
  if (acc.reels.length === 0) return;
  const sorted = [...acc.reels].sort((a, b) => (b.videoViewCount || 0) - (a.videoViewCount || 0));
  line();
  div('─', 80);
  line(`@${u.toUpperCase()}  (${acc.reels.length} reels)`);
  div('─', 80);
  sorted.forEach((r, i) => {
    line(`  ${i + 1}. Date: ${fmtDate(r.timestamp)}  |  Views: ${fmt(r.videoViewCount)}  |  Likes: ${fmt(r.likesCount)}  |  Comments: ${fmt(r.commentsCount)}`);
    line(`     URL: ${r.url}`);
    if (r.caption) {
      line(`     Caption: ${r.caption.replace(/\n/g, ' ')}`);
    }
    if (r.hashtags && r.hashtags.length > 0) {
      line(`     Tags: ${r.hashtags.map(h => '#' + h).join('  ')}`);
    }
    line();
  });
});

// ── 4. All Photos Per Account ────────────────────────────────
section('4. All Photo Posts — Full Data by Account');

sortedAccounts.forEach(([u, acc]) => {
  const photos = acc.posts.filter(p => p.type !== 'Video' && p.productType !== 'clips');
  if (photos.length === 0) return;
  const sorted = [...photos].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  line();
  div('─', 80);
  line(`@${u.toUpperCase()}  (${photos.length} photos)`);
  div('─', 80);
  sorted.forEach((r, i) => {
    line(`  ${i + 1}. Date: ${fmtDate(r.timestamp)}  |  Likes: ${fmt(r.likesCount)}  |  Comments: ${fmt(r.commentsCount)}`);
    line(`     URL: ${r.url}`);
    if (r.caption) {
      line(`     Caption: ${r.caption.replace(/\n/g, ' ')}`);
    }
    if (r.hashtags && r.hashtags.length > 0) {
      line(`     Tags: ${r.hashtags.map(h => '#' + h).join('  ')}`);
    }
    line();
  });
});

fs.writeFileSync(path.join(__dirname, 'competitor_report.txt'), out);
console.log('Text report generated, size:', Buffer.byteLength(out, 'utf8'), 'bytes');
console.log('Base64 size:', Buffer.from(out).toString('base64').length, 'chars');
