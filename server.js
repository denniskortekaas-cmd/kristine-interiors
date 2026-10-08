const express   = require('express');
const { Resend } = require('resend');
const path      = require('path');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Behind Railway's proxy: trust one hop, so rate limiting sees the real IP ──
app.set('trust proxy', 1);

// ── Security headers (CSP disabled to allow Meta Pixel + Google Fonts) ───────
app.use(helmet({ contentSecurityPolicy: false }));

// ── Rate limiting on form endpoint ────────────────────────────────────────────
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: function (req, res) {
    res.status(429).json({ ok: false, error: 'Too many submissions, please try again later.' });
  },
});

// The questionnaire is longer and people do retry it, so it gets its own budget
// instead of eating into the contact form's.
const intakeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: function (req, res) {
    res.status(429).json({ ok: false, error: 'Too many submissions, please try again later.' });
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Block sensitive files from static serving ─────────────────────────────────
app.use(function (req, res, next) {
  const blocked = ['/package.json', '/package-lock.json', '/.env', '/server.js'];
  if (blocked.includes(req.path)) return res.status(403).end();
  next();
});

app.use(express.static(path.join(__dirname)));

// ── Validate API key at startup ───────────────────────────────────────────────
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('FATAL: RESEND_API_KEY is not set — exiting.');
  process.exit(1);
}

const resend = new Resend(apiKey);

// Her own domain, verified with Resend. Everything the site sends leaves from
// here. info@ is deliberate: it forwards to her Gmail, so a client who ignores
// reply-to and writes straight to the sender still reaches her.
const FROM_ADDRESS = 'Kristine Interiors <info@kristineinteriors.com>';
const REPLY_TO = 'kristine.interiors.uae@gmail.com';

// ── HTML escape helper ────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── POST /submit ──────────────────────────────────────────────────────────────
app.post('/submit', submitLimiter, async function (req, res) {
  try {
    const { name, email, phone, 'project-type': service, budget, message } = req.body;

    // Server-side validation
    if (!name || !name.toString().trim()) {
      return res.status(400).json({ ok: false, error: 'Missing required fields.' });
    }
    if (!email || !email.toString().trim()) {
      return res.status(400).json({ ok: false, error: 'Missing required fields.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toString().trim())) {
      return res.status(400).json({ ok: false, error: 'Invalid email address.' });
    }
    if (name.toString().length > 100)    return res.status(400).json({ ok: false, error: 'Name too long.' });
    if (email.toString().length > 254)   return res.status(400).json({ ok: false, error: 'Email too long.' });
    if (message && message.toString().length > 2000) return res.status(400).json({ ok: false, error: 'Message too long.' });

    const serviceLabels = {
      turnkey: 'Turnkey Design',
      styling: 'Interior Styling and Furnishing',
      edesign: 'E-Design Consultation',
      other:   'Not Sure Yet',
    };

    const budgetLabels = {
      'under5k': 'Under AED 5,000',
      '5k-15k':  'AED 5,000 – 15,000',
      '15k-30k': 'AED 15,000 – 30,000',
      '30k-60k': 'AED 30,000 – 60,000',
      '60k+':    'AED 60,000+',
      'unsure':  'Not Sure Yet',
    };

    // Safe labels — never reflect raw user input
    const serviceLabel = serviceLabels[service] || '—';
    const budgetLabel  = budgetLabels[budget]   || '—';

    // Escape all user-supplied values before inserting into HTML
    const safeName    = esc(name);
    const safeEmail   = esc(email);
    const safePhone   = esc(phone) || '—';
    const safeMessage = message ? esc(message).replace(/\n/g, '<br>') : '—';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Georgia, serif; background: #f9f6f1; margin: 0; padding: 40px 0; }
    .wrap { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .header { background: #1a1008; padding: 32px 40px; }
    .header h1 { margin: 0; font-size: 20px; color: #c4a96a; letter-spacing: 0.08em; font-weight: 400; }
    .header p { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.45); font-family: Arial, sans-serif; letter-spacing: 0.06em; }
    .body { padding: 36px 40px; }
    .label { font-family: Arial, sans-serif; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #c4a96a; margin-bottom: 4px; }
    .value { font-size: 16px; color: #1a1008; margin: 0 0 24px; }
    .message-box { background: #f9f6f1; border-left: 3px solid #c4a96a; padding: 16px 20px; margin-top: 8px; border-radius: 0 2px 2px 0; }
    .message-box p { margin: 0; font-size: 15px; color: #3a2a1a; line-height: 1.7; }
    .footer { background: #f9f6f1; padding: 20px 40px; border-top: 1px solid #ede8df; }
    .footer p { margin: 0; font-family: Arial, sans-serif; font-size: 12px; color: #aaa; }
    .reply-btn { display: inline-block; margin-top: 28px; padding: 12px 28px; background: #c4a96a; color: #fff; text-decoration: none; font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 2px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>New Enquiry</h1>
      <p>Kristine Interiors · Dubai</p>
    </div>
    <div class="body">
      <p class="label">Name</p>
      <p class="value">${safeName}</p>

      <p class="label">Email</p>
      <p class="value"><a href="mailto:${safeEmail}" style="color:#c4a96a;">${safeEmail}</a></p>

      <p class="label">WhatsApp / Phone</p>
      <p class="value">${safePhone}</p>

      <p class="label">Service</p>
      <p class="value">${serviceLabel}</p>

      <p class="label">Approximate Budget</p>
      <p class="value">${budgetLabel}</p>

      <p class="label">Message</p>
      <div class="message-box">
        <p>${safeMessage}</p>
      </div>

      <a href="mailto:${safeEmail}" class="reply-btn">Reply to ${safeName}</a>
    </div>
    <div class="footer">
      <p>Submitted via kristineinteriors.com</p>
    </div>
  </div>
</body>
</html>
    `;

    console.log('Sending email via Resend for:', name, email);

    const { data, error } = await resend.emails.send({
      from:     FROM_ADDRESS,
      to:       'kristine.interiors.uae@gmail.com',
      reply_to: email,
      subject:  `New enquiry from ${name}`,
      html,
    });

    if (error) {
      console.error('Resend error:', error.name, error.message, error.statusCode);
      return res.status(500).json({ ok: false, error: 'Something went wrong, please try again.' });
    }

    console.log('Email sent OK, id:', data && data.id);
    return res.json({ ok: true });

  } catch (err) {
    console.error('Unexpected error in /submit:', err.message || err);
    return res.status(500).json({ ok: false, error: 'Something went wrong, please try again.' });
  }
});

// ── Intake questionnaire ──────────────────────────────────────────────────────
// The private link Kristine sends after a first conversation. Only the fields
// listed here are ever read or mailed, so an unexpected field cannot reach the
// inbox. Order matters: it is the order of the email.
const INTAKE_SECTIONS = [
  ['Your details', [
    ['client_ref',    'Personal link'],
    ['name',          'Full name'],
    ['email',         'Email address'],
    ['phone',         'WhatsApp / phone'],
    ['contact_pref',  'Preferred contact'],
    ['location',      'Property location'],
  ]],
  ['Your home', [
    ['property_type', 'Property type'],
    ['stage',         'Stage'],
    ['size',          'Size'],
    ['purpose',       'How it will be used'],
    ['household',     'Who lives there'],
    ['living',        'How they live in the space'],
  ]],
  ['The project', [
    ['service',       'Service'],
    ['rooms',         'Rooms involved'],
    ['goal',          'What it should feel like'],
    ['problem',       'What is not working'],
    ['building_work', 'Building work'],
  ]],
  ['Style and feeling', [
    ['mood',          'Mood words'],
    ['inspiration',   'Inspiration'],
    ['colours',       'Colours'],
    ['materials',     'Materials and finishes'],
    ['avoid',         'To avoid'],
    ['keep',          'Pieces to keep'],
  ]],
  ['Practical', [
    ['budget',        'Budget'],
    ['start',         'Preferred start'],
    ['deadline',      'Deadline'],
    ['plans',         'Floor plans / photos'],
    ['decision',      'Others involved'],
    ['found',         'How they found us'],
    ['extra',         'Anything else'],
  ]],
];

const INTAKE_MAX_LENGTH = 3000;

app.post('/intake', intakeLimiter, async function (req, res) {
  try {
    const body = req.body || {};

    const name  = String(body.name  || '').trim();
    const email = String(body.email || '').trim();

    if (!name || !email) {
      return res.status(400).json({ ok: false, error: 'Missing required fields.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email address.' });
    }
    if (name.length > 100)  return res.status(400).json({ ok: false, error: 'Name too long.' });
    if (email.length > 254) return res.status(400).json({ ok: false, error: 'Email too long.' });

    // Which personal link was used, kept short and plain for the subject line.
    // If it simply repeats the name they typed, it adds nothing, so it is dropped.
    const linkName = String(body.client_ref || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 60);
    const clientRef = linkName.toLowerCase() === name.toLowerCase() ? '' : linkName;

    // Build the email from the whitelist, trimming anything over-long
    let sectionsHtml = '';
    const plainLines = [];

    const values = { ...body, client_ref: clientRef };

    for (const [heading, fields] of INTAKE_SECTIONS) {
      const rows = [];
      for (const [key, label] of fields) {
        const value = String(values[key] ?? '').trim().slice(0, INTAKE_MAX_LENGTH);
        if (!value) continue;
        rows.push(
          '<tr><td class="label">' + esc(label) + '</td>' +
          '<td class="value">' + esc(value).replace(/\n/g, '<br>') + '</td></tr>'
        );
        plainLines.push(label + ': ' + value);
      }
      if (!rows.length) continue;
      sectionsHtml +=
        '<h2 class="section">' + esc(heading) + '</h2>' +
        '<table class="answers">' + rows.join('') + '</table>';
      plainLines.push('');
    }

    const safeName  = esc(name);
    const safeEmail = esc(email);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Georgia, serif; background: #f9f6f1; margin: 0; padding: 40px 0; }
    .wrap { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .header { background: #1a1008; padding: 32px 40px; }
    .header h1 { margin: 0; font-size: 20px; color: #c4a96a; letter-spacing: 0.08em; font-weight: 400; }
    .header p { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.45); font-family: Arial, sans-serif; letter-spacing: 0.06em; }
    .body { padding: 32px 40px 40px; }
    .section { font-size: 12px; font-family: Arial, sans-serif; letter-spacing: 0.16em; text-transform: uppercase; color: #c4a96a; margin: 30px 0 10px; padding-bottom: 8px; border-bottom: 1px solid #ede8df; }
    .section:first-child { margin-top: 0; }
    table.answers { width: 100%; border-collapse: collapse; }
    table.answers td { padding: 9px 0; vertical-align: top; border-bottom: 1px solid #f4f0e9; }
    td.label { font-family: Arial, sans-serif; font-size: 12px; color: #8a7a68; width: 38%; padding-right: 18px; }
    td.value { font-size: 15px; color: #1a1008; line-height: 1.6; }
    .reply-btn { display: inline-block; margin-top: 30px; padding: 12px 28px; background: #c4a96a; color: #fff; text-decoration: none; font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 2px; }
    .footer { background: #f9f6f1; padding: 20px 40px; border-top: 1px solid #ede8df; }
    .footer p { margin: 0; font-family: Arial, sans-serif; font-size: 12px; color: #aaa; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Project Questionnaire</h1>
      <p>Kristine Interiors · Dubai</p>
    </div>
    <div class="body">
      ${sectionsHtml}
      <a href="mailto:${safeEmail}" class="reply-btn">Reply to ${safeName}</a>
    </div>
    <div class="footer">
      <p>Completed via the intake form on kristineinteriors.com</p>
    </div>
  </div>
</body>
</html>
    `;

    console.log('Sending intake email via Resend for:', name, email);

    const { data, error } = await resend.emails.send({
      from:     FROM_ADDRESS,
      to:       'kristine.interiors.uae@gmail.com',
      reply_to: email,
      subject:  clientRef
                  ? `Project questionnaire from ${name} (${clientRef})`
                  : `Project questionnaire from ${name}`,
      html,
      text:     plainLines.join('\n').trim(),
    });

    if (error) {
      console.error('Resend error (intake):', error.name, error.message, error.statusCode);
      return res.status(500).json({ ok: false, error: 'Something went wrong, please try again.' });
    }

    console.log('Intake email sent OK, id:', data && data.id);
    return res.json({ ok: true });

  } catch (err) {
    console.error('Unexpected error in /intake:', err.message || err);
    return res.status(500).json({ ok: false, error: 'Something went wrong, please try again.' });
  }
});

// ── Send a client their questionnaire link ───────────────────────────────────
// The link maker posts here. It hands over a name, an address and the link and
// nothing else: the letter is written below, so the page cannot be used to put
// arbitrary text in someone's inbox, and the link has to be one of ours.
const linkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: function (req, res) {
    res.status(429).json({ ok: false, error: 'Too many for now, try again in a quarter of an hour.' });
  },
});

app.post('/links/send', linkLimiter, async function (req, res) {
  try {
    const body = req.body || {};
    const name = String(body.name || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 60);
    const email = String(body.email || '').trim();
    const url = String(body.url || '').trim();

    if (!name) return res.status(400).json({ ok: false, error: 'No name to greet her by.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ ok: false, error: 'That e-mail address does not look right.' });
    }

    let link;
    try { link = new URL(url); } catch (e) { return res.status(400).json({ ok: false, error: 'That link is not one of ours.' }); }
    const siteOk = /(^|\.)kristineinteriors\.com$/.test(link.hostname)
                || /\.up\.railway\.app$/.test(link.hostname)
                || link.hostname === 'localhost';
    if (!siteOk || !link.pathname.startsWith('/intake')) {
      return res.status(400).json({ ok: false, error: 'That link is not one of ours.' });
    }

    const first = esc(name.split(' ')[0]);
    const safeLink = esc(link.href);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:32px 0;background:#F0EAE0;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EAE0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:92%;background:#FFFFFF;border-radius:4px;overflow:hidden;box-shadow:0 2px 18px rgba(44,26,14,0.10);">

        <tr><td style="background:#2C1A0E;padding:34px 40px;">
          <div style="font-family:Georgia,serif;font-size:21px;color:#C9A96E;letter-spacing:0.06em;">Kristine Interiors</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:0.18em;text-transform:uppercase;margin-top:6px;">Interior Design &middot; Dubai</div>
        </td></tr>

        <tr><td style="padding:38px 40px 10px;">
          <p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#2C1A0E;">Dear ${first},</p>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#3A2A1A;">Thank you for considering Kristine Interiors. Before we speak, it would help me to understand your space and what you would like it to become, so that our conversation starts with a real design direction rather than a blank page.</p>
          <p style="margin:0 0 10px;font-size:16px;line-height:1.75;color:#3A2A1A;">The questionnaire covers:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 26px;">
            <tr><td style="padding:3px 10px 3px 0;color:#C9A96E;font-size:15px;">&mdash;</td><td style="font-size:15px;line-height:1.7;color:#3A2A1A;">your property, and how you use it day to day</td></tr>
            <tr><td style="padding:3px 10px 3px 0;color:#C9A96E;font-size:15px;">&mdash;</td><td style="font-size:15px;line-height:1.7;color:#3A2A1A;">what is not working in the space at present</td></tr>
            <tr><td style="padding:3px 10px 3px 0;color:#C9A96E;font-size:15px;">&mdash;</td><td style="font-size:15px;line-height:1.7;color:#3A2A1A;">the look and feel you are drawn to</td></tr>
            <tr><td style="padding:3px 10px 3px 0;color:#C9A96E;font-size:15px;">&mdash;</td><td style="font-size:15px;line-height:1.7;color:#3A2A1A;">budget and timing, so that any proposal is realistic</td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 26px;">
            <tr><td style="background:#C9A96E;border-radius:3px;">
              <a href="${safeLink}" style="display:inline-block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#FFFFFF;text-decoration:none;">Open the questionnaire</a>
            </td></tr>
          </table>

          <p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#6B5344;">It takes around ten minutes and saves as you go, so you are welcome to complete it in your own time. Anything you would rather discuss in person can be left blank.</p>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#3A2A1A;">I look forward to hearing about your project.</p>
          <p style="margin:0 0 6px;font-size:16px;line-height:1.7;color:#3A2A1A;">Kind regards,</p>
          <p style="margin:0 0 4px;font-size:16px;color:#2C1A0E;">Kristine</p>
          <p style="margin:0 0 34px;font-size:13px;color:#6B5344;">Kristine Interiors &middot; Interior Design &middot; Dubai</p>
        </td></tr>

        <tr><td style="background:#FAF7F2;padding:18px 40px;border-top:1px solid #EDE8DF;">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#A99884;">If the button does not work, open this link:<br />${safeLink}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `;

    const { data, error } = await resend.emails.send({
      from:     FROM_ADDRESS,
      to:       email,
      reply_to: REPLY_TO,
      subject:  'Your project questionnaire \u00b7 Kristine Interiors',
      html,
      text: 'Dear ' + name.split(' ')[0] + ',\n\n'
          + 'Thank you for considering Kristine Interiors. Before we speak, it would help me to '
          + 'understand your space and what you would like it to become, so that our conversation '
          + 'starts with a real design direction rather than a blank page.\n\n' + link.href + '\n\n'
          + 'It takes around ten minutes and saves as you go, so you are welcome to complete it in '
          + 'your own time.\n\nI look forward to hearing about your project.\n\n'
          + 'Kind regards,\nKristine\nKristine Interiors \u00b7 Interior Design \u00b7 Dubai',
    });

    if (error) {
      console.error('Resend error (links):', error.name, error.message, error.statusCode);
      return res.status(502).json({ ok: false, error: error.message || 'Resend refused to send it.' });
    }

    console.log('Questionnaire link sent to', email, 'id:', data && data.id);
    return res.json({ ok: true });

  } catch (err) {
    console.error('Unexpected error in /links/send:', err.message || err);
    return res.status(500).json({ ok: false, error: 'Something went wrong, please try again.' });
  }
});

// Kristine's own link maker. Not linked from anywhere and noindex; it only
// assembles a URL, so there is nothing behind it to protect.
app.get('/links', function (req, res) {
  res.sendFile(path.join(__dirname, 'links.html'));
});

// Clean URLs for the questionnaire. /intake is the neutral link; /intake/anna-petrova
// is the personal one, and the page greets that client by name.
app.get(['/intake', '/intake/:client'], function (req, res) {
  res.sendFile(path.join(__dirname, 'intake.html'));
});

// Fallback — serve index.html for any unknown route
app.get('*', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, function () {
  console.log('Server running on port ' + PORT);
});
