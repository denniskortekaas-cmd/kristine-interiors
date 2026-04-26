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
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const accountNotes = {
  'musedesign.ae': 'Luxury Dubai firm — villa/apt walkthroughs, highest view counts, strong CTAs',
  'katrina.antonovich.official': 'Ultra-high likes (12–14K per reel), lower views — small but very engaged audience',
  'ol_interior_dubai': 'Russian-language renovation vlogs, consistent output (27 reels scraped)',
  'hosskianii': 'Real estate + lifestyle hybrid, casual tone, high reel frequency',
  'sakinakaradesign': 'UAE-based designer, lower posting frequency',
  'interiorsbycollins': 'Very limited data — only 7 posts scraped',
  '2088.real.estate': 'Real estate agency crossover account',
  'moroz.lor': 'Minimal posts in dataset',
  'thestateofmindpalestine': 'Unrelated — appeared via tag/mention',
};

// Group by account
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

let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; margin: 40px; color: #222; line-height: 1.5; }
  h1 { font-size: 20pt; color: #1a1a2e; }
  h2 { font-size: 14pt; color: #2d4a7a; margin-top: 36px; border-bottom: 2px solid #2d4a7a; padding-bottom: 4px; }
  h3 { font-size: 12pt; color: #333; margin-top: 22px; }
  p.meta { color: #666; font-size: 10pt; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 9pt; }
  th { background: #2d4a7a; color: white; padding: 6px 8px; text-align: left; font-size: 9pt; }
  td { border: 1px solid #ddd; padding: 5px 8px; vertical-align: top; }
  tr:nth-child(even) { background: #f7f9fc; }
  .caption { max-width: 380px; word-wrap: break-word; white-space: pre-wrap; }
  .tag { color: #2d4a7a; }
  a { color: #0066cc; font-size: 8pt; }
  .badge { background: #2d4a7a; color: white; border-radius: 3px; padding: 1px 5px; font-size: 8pt; }
</style>
</head>
<body>
`;

html += `<h1>Kristine Interiors — Dubai Competitor Instagram Analysis</h1>
<p class="meta">
  <b>Generated:</b> ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
  &nbsp;|&nbsp; <b>Accounts scraped:</b> 8
  &nbsp;|&nbsp; <b>Total posts:</b> ${posts.length}
  &nbsp;|&nbsp; <b>Reels found:</b> ${reels.length}
  &nbsp;|&nbsp; <b>Photo posts:</b> ${posts.length - reels.length}
</p>
<p>Competitor intelligence for <b>@kristine.interiors</b> (Japandi interior designer, Dubai, UAE). Data scraped via Apify Instagram Scraper on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}.</p>
`;

// ── SECTION 1: Account Summary ─────────────────────────────────
html += `<h2>1. Account Performance Summary</h2>
<table>
<tr>
  <th>Account</th>
  <th>Posts Scraped</th>
  <th>Reels</th>
  <th>Avg Views / Reel</th>
  <th>Top Reel Views</th>
  <th>Avg Likes / Post</th>
  <th>Notes</th>
</tr>`;

sortedAccounts.forEach(([u, acc]) => {
  const r = acc.reels;
  const avgViews = r.length ? Math.round(r.reduce((s, x) => s + (x.videoViewCount || 0), 0) / r.length) : 0;
  const topViews = r.length ? Math.max(...r.map(x => x.videoViewCount || 0)) : 0;
  const avgLikes = acc.posts.length ? Math.round(acc.posts.reduce((s, x) => s + (x.likesCount || 0), 0) / acc.posts.length) : 0;
  html += `<tr>
    <td><b>@${esc(u)}</b></td>
    <td>${acc.posts.length}</td>
    <td>${r.length}</td>
    <td>${fmt(avgViews)}</td>
    <td>${fmt(topViews)}</td>
    <td>${fmt(avgLikes)}</td>
    <td>${esc(accountNotes[u] || '')}</td>
  </tr>`;
});
html += '</table>';

// ── SECTION 2: Top 20 Viral Reels ──────────────────────────────
html += `<h2>2. Top 20 Viral Reels (Ranked by Views)</h2>
<table>
<tr>
  <th>#</th><th>Account</th><th>Views</th><th>Likes</th><th>Comments</th>
  <th>Date</th><th>Caption</th><th>Hashtags</th><th>Link</th>
</tr>`;

const topReels = [...reels].sort((a, b) => (b.videoViewCount || 0) - (a.videoViewCount || 0)).slice(0, 20);
topReels.forEach((r, i) => {
  const tags = (r.hashtags || []).map(h => `<span class="tag">#${esc(h)}</span>`).join(' ');
  html += `<tr>
    <td>${i + 1}</td>
    <td><b>@${esc(r.ownerUsername)}</b></td>
    <td>${fmt(r.videoViewCount)}</td>
    <td>${fmt(r.likesCount)}</td>
    <td>${fmt(r.commentsCount)}</td>
    <td>${fmtDate(r.timestamp)}</td>
    <td class="caption">${esc(r.caption || '')}</td>
    <td class="caption">${tags}</td>
    <td><a href="${r.url}">${r.shortCode}</a></td>
  </tr>`;
});
html += '</table>';

// ── SECTION 3: All Reels Per Account ───────────────────────────
html += `<h2>3. All Reels — Full Data by Account</h2>`;

sortedAccounts.forEach(([u, acc]) => {
  if (acc.reels.length === 0) return;
  const sorted = [...acc.reels].sort((a, b) => (b.videoViewCount || 0) - (a.videoViewCount || 0));
  html += `<h3>@${esc(u)} &nbsp;<span class="badge">${acc.reels.length} reels</span></h3>
  <table>
  <tr><th>Date</th><th>Views</th><th>Likes</th><th>Comments</th><th>Caption (full)</th><th>Hashtags</th><th>Link</th></tr>`;
  sorted.forEach(r => {
    const tags = (r.hashtags || []).map(h => `<span class="tag">#${esc(h)}</span>`).join(' ');
    html += `<tr>
      <td>${fmtDate(r.timestamp)}</td>
      <td>${fmt(r.videoViewCount)}</td>
      <td>${fmt(r.likesCount)}</td>
      <td>${fmt(r.commentsCount)}</td>
      <td class="caption">${esc(r.caption || '')}</td>
      <td class="caption">${tags}</td>
      <td><a href="${r.url}">${r.shortCode}</a></td>
    </tr>`;
  });
  html += '</table>';
});

// ── SECTION 4: All Photos Per Account ──────────────────────────
html += `<h2>4. All Photo Posts — Full Data by Account</h2>`;

sortedAccounts.forEach(([u, acc]) => {
  const photos = acc.posts.filter(p => p.type !== 'Video' && p.productType !== 'clips');
  if (photos.length === 0) return;
  const sorted = [...photos].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  html += `<h3>@${esc(u)} &nbsp;<span class="badge">${photos.length} photos</span></h3>
  <table>
  <tr><th>Date</th><th>Likes</th><th>Comments</th><th>Caption (full)</th><th>Hashtags</th><th>Link</th></tr>`;
  sorted.forEach(r => {
    const tags = (r.hashtags || []).map(h => `<span class="tag">#${esc(h)}</span>`).join(' ');
    html += `<tr>
      <td>${fmtDate(r.timestamp)}</td>
      <td>${fmt(r.likesCount)}</td>
      <td>${fmt(r.commentsCount)}</td>
      <td class="caption">${esc(r.caption || '')}</td>
      <td class="caption">${tags}</td>
      <td><a href="${r.url}">${r.shortCode}</a></td>
    </tr>`;
  });
  html += '</table>';
});

html += `</body></html>`;

fs.writeFileSync(path.join(__dirname, 'competitor_report.html'), html);
console.log('Done. HTML length:', html.length, 'chars');
