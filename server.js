const express  = require('express');
const nodemailer = require('nodemailer');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ── POST /submit ─────────────────────────────────────────────
app.post('/submit', async function (req, res) {
  const { name, email, phone, 'project-type': service, budget, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ ok: false, error: 'Missing required fields.' });
  }

  const serviceLabels = {
    turnkey:  'Turnkey Design',
    styling:  'Interior Styling and Furnishing',
    edesign:  'E-Design Consultation',
    other:    'Not Sure Yet',
  };

  const budgetLabels = {
    'under5k':  'Under AED 5,000',
    '5k-15k':   'AED 5,000 – 15,000',
    '15k-30k':  'AED 15,000 – 30,000',
    '30k-60k':  'AED 30,000 – 60,000',
    '60k+':     'AED 60,000+',
    'unsure':   'Not Sure Yet',
  };

  const serviceLabel = serviceLabels[service] || service || '—';
  const budgetLabel  = budgetLabels[budget]   || budget  || '—';

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout:   10000,
    socketTimeout:     10000,
  });

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
      <p class="value">${name}</p>

      <p class="label">Email</p>
      <p class="value"><a href="mailto:${email}" style="color:#c4a96a;">${email}</a></p>

      <p class="label">WhatsApp / Phone</p>
      <p class="value">${phone || '—'}</p>

      <p class="label">Service</p>
      <p class="value">${serviceLabel}</p>

      <p class="label">Approximate Budget</p>
      <p class="value">${budgetLabel}</p>

      <p class="label">Message</p>
      <div class="message-box">
        <p>${message ? message.replace(/\n/g, '<br>') : '—'}</p>
      </div>

      <a href="mailto:${email}" class="reply-btn">Reply to ${name}</a>
    </div>
    <div class="footer">
      <p>Submitted via kristineinteriors.com</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from:     `"Kristine Interiors" <${process.env.GMAIL_USER}>`,
      to:       process.env.GMAIL_USER,
      replyTo:  email,
      subject:  `New enquiry from ${name}`,
      html,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to send email.' });
  }
});

// Fallback — serve index.html for any unknown route
app.get('*', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, function () {
  console.log('Server running on port ' + PORT);
});
