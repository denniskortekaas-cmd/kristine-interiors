const express   = require('express');
const { Resend } = require('resend');
const path      = require('path');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3000;

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
      from:     'Kristine Interiors <onboarding@resend.dev>',
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

// Fallback — serve index.html for any unknown route
app.get('*', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, function () {
  console.log('Server running on port ' + PORT);
});
