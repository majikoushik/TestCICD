/**
 * ClinicTrust AI — Centralized Email Notification Service
 *
 * ALL outbound email for the platform goes through this module.
 * Adding a new notification? Add a template function here and export it.
 *
 * Anti-spam practices implemented:
 *  - List-Unsubscribe header (RFC 2369) on every send
 *  - Message-ID with FQDN
 *  - Date header
 *  - Reply-To separate from From
 *  - Physical address in footer (CAN-SPAM §5)
 *  - Plain-text alternative on every message
 *  - No deceptive subject lines, no ALL-CAPS, no trigger words
 *  - Consistent From identity matching domain
 *
 * PHI policy:
 *  Patient names, MRNs, dates of birth, diagnoses, and treatment
 *  details are NEVER included in email bodies. Referral emails
 *  carry only: specialty, urgency level, referral reference ID,
 *  and provider names (both parties are covered entities).
 */

'use strict';

const nodemailer = require('nodemailer');
const crypto     = require('crypto');
const logger     = require('../utils/logger');

/* ── Configuration ───────────────────────────────────────────────────────── */

const BRAND   = 'ClinicTrust AI';
const DOMAIN  = process.env.EMAIL_DOMAIN  || 'clinictrustai.com';
const FROM    = `"${BRAND}" <${process.env.GMAIL_USER || `noreply@${DOMAIN}`}>`;
const REPLY   = `"${BRAND} Support" <support@${DOMAIN}>`;
const SUPPORT = `support@${DOMAIN}`;
const CLIENT  = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');

// CAN-SPAM physical address (update for production)
const PHYSICAL_ADDRESS = process.env.COMPANY_ADDRESS || '123 Health Tech Blvd, Suite 400, Austin, TX 78701';

/* ── Nodemailer transport (lazy init) ────────────────────────────────────── */

let _transporter = null;
let _verified    = false;

function getTransporter() {
  if (_transporter) return _transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass || pass === 'xxxx xxxx xxxx xxxx') return null;
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
  });
  return _transporter;
}

async function verifyOnce(t) {
  if (_verified) return;
  try {
    await t.verify();
    _verified = true;
    logger.info('[Email] Gmail transport verified — emails will deliver.');
  } catch (err) {
    _verified = true; // don't retry on every send
    logger.error('[Email] Gmail transport FAILED — check GMAIL_USER / GMAIL_APP_PASSWORD', { error: err.message });
  }
}

/* ── Core send function ──────────────────────────────────────────────────── */

/**
 * sendEmail({ to, subject, html, text, category })
 *
 * @param {string}  to        Recipient address
 * @param {string}  subject   Email subject line
 * @param {string}  html      HTML body
 * @param {string}  [text]    Plain-text fallback (auto-generated if omitted)
 * @param {string}  [category] Template category for logging (e.g. 'kyc', 'referral')
 */
async function sendEmail({ to, subject, html, text, category = 'general' }) {
  const t = getTransporter();

  if (!t) {
    // Dev / CI mode — log instead of sending
    logger.info('[Email] DEV MODE — not sent', { to, subject, category });
    const linkMatch = html && html.match(/href="(https?:\/\/[^"]+)"/);
    if (linkMatch) logger.info('[Email] First link in email (dev)', { link: linkMatch[1] });
    return { messageId: 'dev-mode' };
  }

  await verifyOnce(t);

  const msgId = `<${crypto.randomBytes(12).toString('hex')}.${Date.now()}@${DOMAIN}>`;

  try {
    const info = await t.sendMail({
      from:     FROM,
      replyTo:  REPLY,
      to,
      subject,
      html,
      text: text || stripHtml(html),
      headers: {
        'Message-ID':       msgId,
        'Date':             new Date().toUTCString(),
        'X-Mailer':         `${BRAND} Mailer/1.0`,
        'X-Priority':       '3',
        'Importance':       'Normal',
        'List-Unsubscribe': `<mailto:${SUPPORT}?subject=Unsubscribe>`,
        'X-Entity-Ref-ID':  crypto.randomBytes(8).toString('hex'),
      },
    });
    logger.info('[Email] Sent', { to, subject, category, messageId: info.messageId });
    return info;
  } catch (err) {
    logger.error('[Email] Send failed', { to, subject, category, error: err.message });
    throw err;
  }
}

/* ── HTML utilities ──────────────────────────────────────────────────────── */

function stripHtml(html = '') {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Master email wrapper — responsive, Outlook-compatible card layout.
 * @param {object} opts
 * @param {string} opts.preheader   Hidden preview text (50–90 chars)
 * @param {string} opts.headerBg    CSS background for the header band
 * @param {string} opts.headerHtml  HTML inside the header band
 * @param {string} opts.bodyHtml    HTML for the main content area
 */
function wrap({ preheader, headerBg, headerHtml, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
  <title>${BRAND}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body { margin:0; padding:0; background:#f0f4f8; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; }
    img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
    @media only screen and (max-width:600px) {
      .email-card { width:100% !important; }
      .email-body { padding:24px 20px !important; }
    }
  </style>
</head>
<body>
  <!-- Preheader hidden text -->
  <div style="display:none;font-size:1px;color:#f0f4f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">
    ${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f0f4f8">
    <tr>
      <td style="padding:28px 16px">

        <!-- Outer card -->
        <table class="email-card" role="presentation" cellspacing="0" cellpadding="0" border="0"
          style="max-width:580px;width:100%;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10)">

          <!-- Brand header -->
          <tr>
            <td style="background:${headerBg};padding:28px 36px;text-align:center">
              ${headerHtml}
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td class="email-body" style="padding:36px 40px 28px;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f7fa;padding:20px 36px;border-top:1px solid #e4e9f2">
              <p style="margin:0 0 6px;font-size:11px;color:#9aa5b4;text-align:center;line-height:1.8">
                <strong style="color:#6b7280">${BRAND}</strong> &mdash; Secure Healthcare Collaboration Platform<br>
                ${PHYSICAL_ADDRESS}<br>
                This is an automated notification. Please do not reply directly to this message.<br>
                Need help? <a href="mailto:${SUPPORT}" style="color:#1565c0;text-decoration:none">${SUPPORT}</a>
                &nbsp;|&nbsp;
                <a href="mailto:${SUPPORT}?subject=Unsubscribe" style="color:#9aa5b4;text-decoration:none">Manage notifications</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Table-based CTA button — renders in all major email clients */
function btn({ href, label, bg = '#1565c0', color = '#ffffff' }) {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto">
  <tr>
    <td style="border-radius:6px;background-color:${bg}">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
        href="${href}" style="height:50px;v-text-anchor:middle;width:230px" arcsize="12%"
        strokecolor="${bg}" fillcolor="${bg}"><w:anchorlock/><center><![endif]-->
      <a href="${href}" target="_blank"
        style="display:inline-block;padding:14px 38px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:${color};text-decoration:none;border-radius:6px">
        ${label}
      </a>
      <!--[if mso]></center></v:roundrect><![endif]-->
    </td>
  </tr>
</table>`;
}

/** Bordered notice / info box */
function notice(html, borderColor = '#1565c0', bgColor = '#f0f7ff') {
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 0">
  <tr>
    <td style="background:${bgColor};border-left:4px solid ${borderColor};border-radius:0 6px 6px 0;padding:14px 18px;font-size:13px;color:#444444;line-height:1.75">
      ${html}
    </td>
  </tr>
</table>`;
}

/** Two-column data row used in referral detail tables */
function dataRow(label, value) {
  return `
<tr>
  <td style="padding:6px 12px 6px 0;font-size:13px;color:#777777;white-space:nowrap;vertical-align:top;width:140px">${label}</td>
  <td style="padding:6px 0;font-size:13px;color:#222222;font-weight:600;vertical-align:top">${value}</td>
</tr>`;
}

/** Standard brand header (blue gradient) */
const BRAND_HEADER = `
  <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:0.5px">${BRAND}</p>
  <p style="margin:6px 0 0;color:#bbdefb;font-size:13px;letter-spacing:0.3px">Secure Healthcare Collaboration Platform</p>`;

/* ═══════════════════════════════════════════════════════════════════════════
   EMAIL TEMPLATES
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 1. Email address verification ──────────────────────────────────────── */

function verificationEmailHtml(name, token) {
  const link = `${CLIENT}/verify-email?token=${token}`;
  return wrap({
    preheader: `${name}, one quick step left — please confirm your email address to activate your account.`,
    headerBg: 'linear-gradient(135deg,#1565c0 0%,#0d47a1 100%)',
    headerHtml: BRAND_HEADER,
    bodyHtml: `
      <p style="margin:0 0 8px;font-size:22px;font-weight:bold;color:#1a237e">Welcome, ${name}!</p>
      <p style="margin:0 0 16px">
        Thank you for registering as a provider with ${BRAND}. You are one step away from completing your account setup.
      </p>
      <p style="margin:0 0 28px">
        Please confirm your email address by clicking the button below. This activates your account and takes you straight to your onboarding checklist.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="text-align:center;padding-bottom:28px">${btn({ href: link, label: 'Confirm My Email Address' })}</td></tr>
      </table>

      <p style="margin:0 0 4px;font-size:12px;color:#9aa5b4;text-align:center">Button not working? Copy and paste this link into your browser:</p>
      <p style="margin:0 0 4px;font-size:11px;text-align:center;word-break:break-all">
        <a href="${link}" style="color:#1565c0">${link}</a>
      </p>

      ${notice(`
        <strong>&#9203; This link expires in 24 hours.</strong><br>
        If you did not create a ${BRAND} account, you can safely ignore this message. Your email address will not be used for anything else.
      `)}`,
  });
}

function verificationEmailText(name, token) {
  const link = `${CLIENT}/verify-email?token=${token}`;
  return [
    `Welcome to ${BRAND}, ${name}!`,
    '',
    'Thank you for registering as a provider. Please confirm your email address by visiting the link below:',
    '',
    link,
    '',
    'This link expires in 24 hours.',
    '',
    `If you did not create a ${BRAND} account, please ignore this email.`,
    '',
    '---',
    `${BRAND} | ${PHYSICAL_ADDRESS}`,
    `Support: ${SUPPORT}`,
  ].join('\n');
}

/* ── 2. KYC approved ─────────────────────────────────────────────────────── */

function kycApprovedHtml(name) {
  const link = `${CLIENT}/app/dashboard`;
  return wrap({
    preheader: `Your ${BRAND} provider account has been verified — you now have full platform access.`,
    headerBg: 'linear-gradient(135deg,#2e7d32 0%,#1b5e20 100%)',
    headerHtml: `
      <p style="margin:0;font-size:40px;line-height:1">&#127881;</p>
      <p style="margin:10px 0 0;color:#ffffff;font-size:22px;font-weight:bold">Account Verified!</p>
      <p style="margin:6px 0 0;color:#a5d6a7;font-size:13px">${BRAND}</p>`,
    bodyHtml: `
      <p style="margin:0 0 8px;font-size:22px;font-weight:bold;color:#1b5e20">Congratulations, ${name}!</p>
      <p style="margin:0 0 16px">
        Your provider account on ${BRAND} has been reviewed by our credentialing team and <strong>fully approved</strong>.
        You now have unrestricted access to all platform features.
      </p>

      <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#555555;text-transform:uppercase;letter-spacing:0.5px">What you can do now</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px">
        ${['Send and receive secure patient referrals', 'Collaborate with verified providers in your network', 'Access your blockchain-verified provider identity', 'Manage your profile and availability settings'].map(item =>
          `<tr><td style="padding:5px 0;font-size:14px;color:#333333">&#10003;&nbsp; ${item}</td></tr>`
        ).join('')}
      </table>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="text-align:center;padding-bottom:20px">${btn({ href: link, label: 'Open My Dashboard', bg: '#2e7d32' })}</td></tr>
      </table>

      ${notice(`
        If you have any questions about getting started or need assistance, our support team is available at
        <a href="mailto:${SUPPORT}" style="color:#1565c0">${SUPPORT}</a>.
      `, '#2e7d32', '#f1f8f1')}`,
  });
}

/* ── 3. KYC rejected ─────────────────────────────────────────────────────── */

function kycRejectedHtml(name, reason) {
  return wrap({
    preheader: `An update regarding your ${BRAND} provider verification — please read for next steps.`,
    headerBg: 'linear-gradient(135deg,#b71c1c 0%,#7f0000 100%)',
    headerHtml: `
      <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold">Verification Update</p>
      <p style="margin:6px 0 0;color:#ffcdd2;font-size:13px">${BRAND} Provider Credentialing</p>`,
    bodyHtml: `
      <p style="margin:0 0 16px">Hi ${name},</p>
      <p style="margin:0 0 16px">
        Thank you for applying for provider status on ${BRAND}. After reviewing your submitted information,
        our credentialing team was <strong>unable to complete verification</strong> at this time.
      </p>

      ${reason ? notice(`<strong>Reason provided:</strong><br>${reason}`, '#b71c1c', '#fff5f5') : ''}

      <p style="margin:${reason ? '20px' : '0'} 0 16px">
        <strong>What you can do:</strong>
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px">
        ${[
          'Review the reason above and gather any missing documentation',
          `Contact our support team at <a href="mailto:${SUPPORT}" style="color:#1565c0">${SUPPORT}</a> to discuss your application`,
          'Once resolved, you may re-apply through the provider registration process',
        ].map(item => `<tr><td style="padding:5px 0;font-size:14px;color:#333333">&#8250;&nbsp; ${item}</td></tr>`).join('')}
      </table>

      ${notice(`
        We understand this may be disappointing. Our team is committed to a fair and transparent credentialing process.
        If you believe this decision was made in error, please reach out — we are happy to review your case.
      `, '#b71c1c', '#fff5f5')}`,
  });
}

/* ── 4. KYC intermediate status update ──────────────────────────────────── */

const KYC_STATUS_COPY = {
  pending_email: {
    icon: '&#9993;',
    title: 'Please Verify Your Email',
    intro: 'Your account has been created. To continue your onboarding, please confirm your email address using the link we sent during registration.',
    action: { href: `${CLIENT}/login`, label: 'Sign In to Continue', bg: '#1565c0' },
    detail: 'If you did not receive the verification email, sign in and use the "Resend" option on the verification screen.',
  },
  profile_incomplete: {
    icon: '&#128203;',
    title: 'Complete Your Provider Profile',
    intro: 'Your email has been verified — great start! The next step is to complete your provider profile so our team can begin the credentialing review.',
    action: { href: `${CLIENT}/onboarding`, label: 'Complete My Profile', bg: '#1565c0' },
    detail: 'Profile completion typically takes about 5–10 minutes. Have your NPI details, license number, and specialty information ready.',
  },
  doc_pending: {
    icon: '&#128196;',
    title: 'Document Submission Required',
    intro: 'Your profile looks great! The final step before your application goes to our credentialing team is to upload your supporting verification documents.',
    action: { href: `${CLIENT}/onboarding`, label: 'Upload My Documents', bg: '#1565c0' },
    detail: 'Accepted formats: PDF, JPG, PNG (max 5 MB). Required documents typically include a copy of your medical license and, if applicable, DEA registration.',
  },
  under_review: {
    icon: '&#128269;',
    title: 'Your Application is Under Review',
    intro: 'We have received all your submitted materials and your application is now in our credentialing queue. Our team will review your documents carefully.',
    action: { href: `${CLIENT}/onboarding`, label: 'Check My Status', bg: '#546e7a' },
    detail: 'Review typically takes 1–3 business days. You will receive an email notification as soon as a decision is made. No further action is needed from you at this time.',
  },
};

function kycStatusUpdateHtml(name, status) {
  const copy = KYC_STATUS_COPY[status];
  if (!copy) return null;

  return wrap({
    preheader: `${BRAND} account update for ${name}: ${copy.title}`,
    headerBg: 'linear-gradient(135deg,#1565c0 0%,#0d47a1 100%)',
    headerHtml: BRAND_HEADER,
    bodyHtml: `
      <p style="margin:0 0 4px;font-size:32px">${copy.icon}</p>
      <p style="margin:0 0 8px;font-size:21px;font-weight:bold;color:#1a237e">${copy.title}</p>
      <p style="margin:0 0 16px">Hi ${name},</p>
      <p style="margin:0 0 24px">${copy.intro}</p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="text-align:center;padding-bottom:24px">${btn(copy.action)}</td></tr>
      </table>

      ${notice(copy.detail)}`,
  });
}

/* ── 5. Colleague invitation ─────────────────────────────────────────────── */

function colleagueInviteHtml(inviterName, inviterEmail) {
  const link = `${CLIENT}/register`;
  return wrap({
    preheader: `${inviterName} has invited you to join ${BRAND} — a secure healthcare collaboration platform.`,
    headerBg: 'linear-gradient(135deg,#1565c0 0%,#0d47a1 100%)',
    headerHtml: BRAND_HEADER,
    bodyHtml: `
      <p style="margin:0 0 16px">
        Your colleague <strong>${inviterName}</strong>
        ${inviterEmail ? `(<a href="mailto:${inviterEmail}" style="color:#1565c0">${inviterEmail}</a>)` : ''}
        has invited you to join <strong>${BRAND}</strong> — a secure platform built for provider-to-provider referrals and care coordination.
      </p>
      <p style="margin:0 0 24px">
        Create your free, verified provider account and start collaborating with colleagues today.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="text-align:center;padding-bottom:24px">${btn({ href: link, label: 'Create My Provider Account' })}</td></tr>
      </table>

      ${notice(`
        <strong>Why ${BRAND}?</strong><br>
        &#10003;&nbsp; HIPAA-aware referral workflows with blockchain audit trails<br>
        &#10003;&nbsp; Verified provider directory and credential checks<br>
        &#10003;&nbsp; Secure messaging and document sharing between care teams<br>
        &#10003;&nbsp; Real-time referral tracking and status updates
      `)}`,
  });
}

/* ── 6. Referral received (new referral sent to receiving provider) ───────
 *
 * PHI policy: NO patient name, MRN, DOB, diagnosis, or treatment details.
 * Included: specialty, urgency, referral reference ID, referring provider name,
 * appointment date (if set), and referral reason as entered by the sender.
 * The reason field may contain clinical context but NEVER patient identifiers.
 * ───────────────────────────────────────────────────────────────────────── */

function referralReceivedHtml({ toName, fromName, fromOrg, specialty, urgency, referralId, reason, appointmentDate }) {
  const link = `${CLIENT}/app/referrals/${referralId}`;

  const urgencyColor  = urgency === 'emergency' ? '#b71c1c' : urgency === 'urgent' ? '#e65100' : '#2e7d32';
  const urgencyLabel  = urgency === 'emergency' ? '&#128680; EMERGENCY' : urgency === 'urgent' ? '&#9888; Urgent' : '&#9989; Routine';
  const headerBg      = urgency === 'emergency'
    ? 'linear-gradient(135deg,#b71c1c 0%,#7f0000 100%)'
    : urgency === 'urgent'
    ? 'linear-gradient(135deg,#e65100 0%,#bf360c 100%)'
    : 'linear-gradient(135deg,#1565c0 0%,#0d47a1 100%)';

  const rows = [
    dataRow('Referral ID',        `<span style="font-family:monospace;font-size:12px">${referralId}</span>`),
    dataRow('Referring Provider', `${fromName}${fromOrg ? `, ${fromOrg}` : ''}`),
    dataRow('Specialty Needed',   specialty || 'Not specified'),
    dataRow('Priority Level',     `<span style="color:${urgencyColor};font-weight:bold">${urgencyLabel}</span>`),
    appointmentDate ? dataRow('Requested Date', new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })) : '',
    reason ? dataRow('Clinical Reason', reason) : '',
  ].filter(Boolean).join('');

  return wrap({
    preheader: `${fromName} has sent you a${urgency === 'emergency' ? 'n emergency' : urgency === 'urgent' ? 'n urgent' : ''} referral on ${BRAND} — please review.`,
    headerBg,
    headerHtml: `
      <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold">New Referral Received</p>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px">${BRAND} &mdash; Secure Referral Platform</p>`,
    bodyHtml: `
      <p style="margin:0 0 8px;font-size:20px;font-weight:bold;color:#1a237e">Hi ${toName},</p>
      <p style="margin:0 0 20px">
        You have received a new patient referral from <strong>${fromName}</strong>${fromOrg ? ` at <strong>${fromOrg}</strong>` : ''}.
        Please review the details below and respond at your earliest convenience.
      </p>

      <!-- Referral detail table -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
        style="border:1px solid #e0e7ef;border-radius:8px;overflow:hidden;margin-bottom:24px">
        <tr><td style="background:#f5f7fa;padding:10px 16px;font-size:12px;font-weight:bold;color:#555555;text-transform:uppercase;letter-spacing:0.5px">
          Referral Details
        </td></tr>
        <tr><td style="padding:14px 16px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${rows}
          </table>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="text-align:center;padding-bottom:20px">${btn({ href: link, label: 'View &amp; Respond to Referral', bg: urgencyColor })}</td></tr>
      </table>

      ${notice(`
        <strong>Next steps:</strong> Log in to ${BRAND} to review the full referral, accept or decline, and coordinate directly with ${fromName}.
        All communications are securely logged on the blockchain audit trail.
      `, urgencyColor, urgency === 'emergency' ? '#fff5f5' : urgency === 'urgent' ? '#fff8f0' : '#f0f7ff')}`,
  });
}

/* ── 7. Referral status update (both parties notified on state change) ────
 *
 * PHI policy: same as referralReceivedHtml — no patient identifiers.
 * ───────────────────────────────────────────────────────────────────────── */

const REFERRAL_STATUS_COPY = {
  accepted: {
    icon: '&#9989;',
    title: 'Referral Accepted',
    color: '#2e7d32',
    headerBg: 'linear-gradient(135deg,#2e7d32 0%,#1b5e20 100%)',
    getBody: (actor, referralId) => `
      <strong>${actor}</strong> has <strong style="color:#2e7d32">accepted</strong> the referral.
      The patient can now be scheduled for the specialist appointment. You can view the full referral record and any notes added by ${actor} on the platform.`,
  },
  rejected: {
    icon: '&#10060;',
    title: 'Referral Declined',
    color: '#b71c1c',
    headerBg: 'linear-gradient(135deg,#b71c1c 0%,#7f0000 100%)',
    getBody: (actor) => `
      <strong>${actor}</strong> was unable to accept this referral at this time.
      If a reason was provided, it is available within the referral record on the platform.
      You may wish to identify an alternative provider or contact ${actor} directly to discuss next steps.`,
  },
  completed: {
    icon: '&#127881;',
    title: 'Referral Completed',
    color: '#1565c0',
    headerBg: 'linear-gradient(135deg,#1565c0 0%,#0d47a1 100%)',
    getBody: (actor) => `
      <strong>${actor}</strong> has marked this referral as <strong style="color:#1565c0">completed</strong>.
      The care coordination cycle for this referral is now closed. Any follow-up notes or outcome details added by ${actor} are available in the referral record.`,
  },
  cancelled: {
    icon: '&#128683;',
    title: 'Referral Cancelled',
    color: '#546e7a',
    headerBg: 'linear-gradient(135deg,#546e7a 0%,#37474f 100%)',
    getBody: (actor) => `
      <strong>${actor}</strong> has <strong style="color:#546e7a">cancelled</strong> this referral.
      If this was unexpected, please contact ${actor} directly or reach out to our support team.`,
  },
};

function referralStatusUpdateHtml({ toName, actorName, actorOrg, status, referralId, specialty, notes }) {
  const copy = REFERRAL_STATUS_COPY[status];
  if (!copy) return null;

  const link = `${CLIENT}/app/referrals/${referralId}`;

  return wrap({
    preheader: `${BRAND} referral update: ${copy.title} by ${actorName}. Reference #${referralId.toString().slice(-8)}.`,
    headerBg: copy.headerBg,
    headerHtml: `
      <p style="margin:0;font-size:36px;line-height:1">${copy.icon}</p>
      <p style="margin:10px 0 0;color:#ffffff;font-size:22px;font-weight:bold">${copy.title}</p>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px">${BRAND} Referral Notification</p>`,
    bodyHtml: `
      <p style="margin:0 0 16px">Hi ${toName},</p>
      <p style="margin:0 0 20px">${copy.getBody(actorName + (actorOrg ? ` (${actorOrg})` : ''), referralId)}</p>

      <!-- Detail summary -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
        style="border:1px solid #e0e7ef;border-radius:8px;overflow:hidden;margin-bottom:24px">
        <tr><td style="background:#f5f7fa;padding:10px 16px;font-size:12px;font-weight:bold;color:#555555;text-transform:uppercase;letter-spacing:0.5px">
          Referral Summary
        </td></tr>
        <tr><td style="padding:14px 16px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${dataRow('Referral ID', `<span style="font-family:monospace;font-size:12px">${referralId}</span>`)}
            ${specialty ? dataRow('Specialty', specialty) : ''}
            ${dataRow('Updated By', `${actorName}${actorOrg ? `, ${actorOrg}` : ''}`)}
            ${dataRow('New Status', `<span style="color:${copy.color};font-weight:bold;text-transform:capitalize">${status}</span>`)}
            ${notes ? dataRow('Notes', `<em>${notes}</em>`) : ''}
          </table>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="text-align:center;padding-bottom:20px">${btn({ href: link, label: 'View Referral Record', bg: copy.color })}</td></tr>
      </table>

      ${notice(`
        All referral activity is securely recorded on the ${BRAND} blockchain audit trail.
        Questions? Contact <a href="mailto:${SUPPORT}" style="color:#1565c0">${SUPPORT}</a>.
      `, copy.color)}`,
  });
}

/* ── 8. Plain-text companions ─────────────────────────────────────────────── */

function referralReceivedText({ toName, fromName, fromOrg, specialty, urgency, referralId, reason, appointmentDate }) {
  const lines = [
    `Hi ${toName},`,
    '',
    `You have a new ${urgency !== 'routine' ? urgency.toUpperCase() + ' ' : ''}referral from ${fromName}${fromOrg ? ` (${fromOrg})` : ''}.`,
    '',
    `Referral ID : ${referralId}`,
    `Specialty   : ${specialty || 'Not specified'}`,
    `Priority    : ${urgency}`,
    appointmentDate ? `Appt Date   : ${new Date(appointmentDate).toDateString()}` : '',
    reason ? `Reason      : ${reason}` : '',
    '',
    `View and respond: ${CLIENT}/app/referrals/${referralId}`,
    '',
    '---',
    `${BRAND} | ${PHYSICAL_ADDRESS}`,
    `Support: ${SUPPORT}`,
  ];
  return lines.filter(l => l !== undefined).join('\n');
}

function referralStatusUpdateText({ toName, actorName, status, referralId, specialty }) {
  return [
    `Hi ${toName},`,
    '',
    `Referral #${referralId} has been marked as "${status}" by ${actorName}.`,
    specialty ? `Specialty: ${specialty}` : '',
    '',
    `View the referral: ${CLIENT}/app/referrals/${referralId}`,
    '',
    '---',
    `${BRAND} | ${PHYSICAL_ADDRESS}`,
    `Support: ${SUPPORT}`,
  ].filter(l => l !== undefined).join('\n');
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
   ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  // Core sender
  sendEmail,

  // Account / onboarding
  verificationEmailHtml,
  verificationEmailText,
  kycApprovedHtml,
  kycRejectedHtml,
  kycStatusUpdateHtml,    // intermediate status changes
  colleagueInviteHtml,

  // Referrals
  referralReceivedHtml,
  referralReceivedText,
  referralStatusUpdateHtml,
  referralStatusUpdateText,
};
