const nodemailer = require('nodemailer');

let transporter = null;
let transporterVerified = false;

const FROM = `"ClinicTrust AI" <${process.env.GMAIL_USER || 'noreply@clinictrustai.com'}>`;
const CLIENT = process.env.CLIENT_URL || 'http://localhost:3000';

function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass || pass === 'xxxx xxxx xxxx xxxx') {
    return null;
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return transporter;
}

// Verify Gmail connection on first use and log the result
async function verifyTransporter(t) {
  if (transporterVerified) return;
  try {
    await t.verify();
    transporterVerified = true;
    console.log('[EmailService] Gmail connection verified — emails will be delivered.');
  } catch (err) {
    transporterVerified = true; // don't retry on every send
    console.error('[EmailService] Gmail connection FAILED:', err.message);
    console.error('[EmailService] Check that GMAIL_USER and GMAIL_APP_PASSWORD in .env are correct.');
    console.error('[EmailService] App passwords: myaccount.google.com/apppasswords (requires 2FA).');
  }
}

async function sendEmail({ to, subject, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n📧  [DEV EMAIL — not sent]\n   To: ${to}\n   Subject: ${subject}\n`);
    // Extract and log verification link for dev convenience
    const linkMatch = html && html.match(/href="(http[^"]+verify[^"]+)"/);
    if (linkMatch) console.log(`   Verify link: ${linkMatch[1]}\n`);
    return { messageId: 'dev-mode' };
  }
  await verifyTransporter(t);
  try {
    const info = await t.sendMail({ from: FROM, to, subject, html });
    console.log(`[EmailService] Email sent to ${to} — messageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
    // Log verification links to console as a fallback so onboarding isn't blocked
    const linkMatch = html && html.match(/href="(http[^"]+verify[^"]+)"/);
    if (linkMatch) console.log(`[EmailService] Fallback verify link: ${linkMatch[1]}`);
    throw err;
  }
}

// ── Templates ──────────────────────────────────────────────────────────────

function verificationEmailHtml(name, token) {
  const link = `${CLIENT}/verify-email?token=${token}`;
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#1565c0,#0d47a1);padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">ClinicTrust AI</h1>
      <p style="color:#bbdefb;margin:8px 0 0">Provider Verification</p>
    </div>
    <div style="padding:32px">
      <h2 style="color:#1a237e;margin-top:0">Welcome, ${name}!</h2>
      <p style="color:#555;line-height:1.6">
        Thank you for registering with ClinicTrust AI. Please verify your email address to continue your onboarding.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${link}" style="background:#1565c0;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px">
          Verify Email Address
        </a>
      </div>
      <p style="color:#888;font-size:13px;text-align:center">
        This link expires in 24 hours.<br>
        If you didn't create an account, you can safely ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#aaa;font-size:12px;text-align:center">
        ClinicTrust AI — Secure Healthcare Referral Platform
      </p>
    </div>
  </div>
</body>
</html>`;
}

function kycApprovedHtml(name) {
  const link = `${CLIENT}/app/dashboard`;
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#2e7d32,#1b5e20);padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0">🎉 You're Verified!</h1>
    </div>
    <div style="padding:32px">
      <h2 style="color:#1b5e20;margin-top:0">Congratulations, ${name}!</h2>
      <p style="color:#555;line-height:1.6">
        Your provider account has been verified. You now have full access to ClinicTrust AI.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${link}" style="background:#2e7d32;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px">
          Go to Dashboard
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function kycRejectedHtml(name, reason) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
    <div style="background:#c62828;padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0">Verification Update</h1>
    </div>
    <div style="padding:32px">
      <p>Hi ${name},</p>
      <p>Unfortunately we were unable to verify your provider account at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please contact <a href="mailto:support@clinictrustai.com">support@clinictrustai.com</a> for assistance.</p>
    </div>
  </div>
</body>
</html>`;
}

function colleagueInviteHtml(inviterName, inviterEmail) {
  const link = `${CLIENT}/register`;
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#1565c0,#0d47a1);padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0">ClinicTrust AI</h1>
    </div>
    <div style="padding:32px">
      <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to join ClinicTrust AI — a secure platform for healthcare referrals and care coordination.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${link}" style="background:#1565c0;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold">
          Join ClinicTrust AI
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { sendEmail, verificationEmailHtml, kycApprovedHtml, kycRejectedHtml, colleagueInviteHtml };
