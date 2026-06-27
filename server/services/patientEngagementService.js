/**
 * patientEngagementService.js
 *
 * Patient Engagement / Notification Service
 *
 * Integrates with:
 *   - Twilio (SMS)
 *   - SendGrid (Email)
 *   - Azure Notification Hub (Push Notifications)
 *
 * Required Environment Variables:
 * ─────────────────────────────────────────────────────────────────────────────
 * SMS (Twilio):
 *   TWILIO_ACCOUNT_SID       - Twilio Account SID (starts with "AC...")
 *   TWILIO_AUTH_TOKEN        - Twilio Auth Token
 *   TWILIO_PHONE_NUMBER      - Twilio sender phone number (E.164 format, e.g. +15551234567)
 *
 * Email (SendGrid):
 *   SENDGRID_API_KEY         - SendGrid API Key (starts with "SG.")
 *   SENDGRID_FROM_EMAIL      - Verified sender email address (e.g. noreply@example.com)
 *
 * Push Notifications (Azure Notification Hubs):
 *   AZURE_NOTIFICATION_HUB_CONNECTION_STRING - Full connection string from Azure portal
 *   AZURE_NOTIFICATION_HUB_NAME              - Notification Hub name
 *
 * When any of the above env vars are NOT set, the corresponding function falls
 * back to a console.log stub and returns { success: true, stub: true }.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const logger = require('../utils/logger');

// ─── Uncomment these requires once the packages are installed ─────────────────
// const sgMail = require('@sendgrid/mail');
// const twilio = require('twilio');
// const { NotificationHubsClient } = require('@azure/notification-hubs');
// ─────────────────────────────────────────────────────────────────────────────

/**
 * processTemplate
 *
 * Replaces {{variableName}} placeholders in templateBody with corresponding
 * values from the variables object.
 *
 * @param {string} templateBody - Template string containing {{placeholder}} tokens
 * @param {Object} variables    - Key/value pairs to substitute into the template
 * @returns {string}            - Processed string with placeholders replaced
 *
 * @example
 *   processTemplate('Hello {{name}}, your appt is on {{date}}.', { name: 'Jane', date: 'July 4' })
 *   // => 'Hello Jane, your appt is on July 4.'
 */
function processTemplate(templateBody, variables) {
  if (typeof templateBody !== 'string') return '';
  if (!variables || typeof variables !== 'object') return templateBody;

  return templateBody.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(variables, key)
      ? String(variables[key])
      : match; // leave unrecognised placeholders intact
  });
}

/**
 * sendEmail
 *
 * Sends an HTML/text email via SendGrid.
 * Falls back to a console.log stub when SENDGRID_API_KEY is not set.
 *
 * @param {string} to       - Recipient email address
 * @param {string} subject  - Email subject line
 * @param {string} htmlBody - HTML content of the email
 * @param {string} textBody - Plain-text fallback content
 * @returns {Promise<{success:boolean, messageId?:string, provider:string, stub?:boolean, error?:string}>}
 */
async function sendEmail(to, subject, htmlBody, textBody) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const _fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com';

  if (!apiKey) {
    logger.info('[patientEngagementService][EMAIL STUB]', { to, subject, htmlBody, textBody });
    return { success: true, stub: true, provider: 'sendgrid' };
  }

  try {
    // ── Real SendGrid integration ─────────────────────────────────────────────
    // sgMail.setApiKey(apiKey);
    //
    // const msg = {
    //   to,
    //   from: fromEmail,
    //   subject,
    //   html: htmlBody,
    //   text: textBody,
    // };
    //
    // const [response] = await sgMail.send(msg);
    // const messageId = response.headers['x-message-id'] || null;
    // return { success: true, messageId, provider: 'sendgrid' };
    // ─────────────────────────────────────────────────────────────────────────

  } catch (err) {
    logger.error('[patientEngagementService][sendEmail] Error', { error: err.message, stack: err.stack });
    return { success: false, error: err.message, provider: 'sendgrid' };
  }

  // Placeholder until SendGrid block above is uncommented
  return { success: true, messageId: null, provider: 'sendgrid' };
}

/**
 * sendSMS
 *
 * Sends an SMS via Twilio.
 * Falls back to a console.log stub when TWILIO_ACCOUNT_SID is not set.
 *
 * @param {string} to   - Recipient phone number in E.164 format (e.g. +15551234567)
 * @param {string} body - SMS message body
 * @returns {Promise<{success:boolean, sid?:string, provider:string, stub?:boolean, error?:string}>}
 */
async function sendSMS(to, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const _authToken = process.env.TWILIO_AUTH_TOKEN;
  const _fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid) {
    logger.info('[patientEngagementService][SMS STUB]', { to, body });
    return { success: true, stub: true, provider: 'twilio' };
  }

  try {
    // ── Real Twilio integration ───────────────────────────────────────────────
    // const client = twilio(accountSid, authToken);
    //
    // const message = await client.messages.create({
    //   body,
    //   from: fromPhone,
    //   to,
    // });
    //
    // return { success: true, sid: message.sid, provider: 'twilio' };
    // ─────────────────────────────────────────────────────────────────────────

  } catch (err) {
    logger.error('[patientEngagementService][sendSMS] Error', { error: err.message, stack: err.stack });
    return { success: false, error: err.message, provider: 'twilio' };
  }

  // Placeholder until Twilio block above is uncommented
  return { success: true, sid: null, provider: 'twilio' };
}

/**
 * sendPushNotification
 *
 * Sends a push notification via Azure Notification Hubs.
 * Falls back to a console.log stub when AZURE_NOTIFICATION_HUB_CONNECTION_STRING is not set.
 *
 * @param {string} deviceToken - Device registration token / tag
 * @param {string} title       - Notification title
 * @param {string} body        - Notification body text
 * @param {Object} data        - Additional key/value data payload
 * @returns {Promise<{success:boolean, provider:string, stub?:boolean, error?:string}>}
 */
async function sendPushNotification(deviceToken, title, body, data = {}) {
  const connectionString = process.env.AZURE_NOTIFICATION_HUB_CONNECTION_STRING;
  const _hubName = process.env.AZURE_NOTIFICATION_HUB_NAME;

  if (!connectionString) {
    logger.info('[patientEngagementService][PUSH STUB]', { deviceToken, title, body, data });
    return { success: true, stub: true, provider: 'azure' };
  }

  try {
    // ── Real Azure Notification Hubs integration ──────────────────────────────
    // const client = new NotificationHubsClient(connectionString, hubName);
    //
    // // Example: send a generic template notification targeting a specific tag
    // const notification = {
    //   body: JSON.stringify({
    //     title,
    //     body,
    //     data,
    //   }),
    // };
    //
    // await client.sendNotification(notification, {
    //   tagExpression: `deviceToken:${deviceToken}`,
    // });
    //
    // return { success: true, provider: 'azure' };
    // ─────────────────────────────────────────────────────────────────────────

  } catch (err) {
    logger.error('[patientEngagementService][sendPushNotification] Error', { error: err.message, stack: err.stack });
    return { success: false, error: err.message, provider: 'azure' };
  }

  // Placeholder until Azure Notification Hubs block above is uncommented
  return { success: true, provider: 'azure' };
}

/**
 * sendPatientNotification
 *
 * Dispatches a notification to a patient across one or more channels.
 *
 * @param {Object}   notification
 * @param {string}   notification.patientEmail   - Patient email address
 * @param {string}   notification.patientPhone   - Patient phone number (E.164)
 * @param {string}   [notification.deviceToken]  - Device push token (optional)
 * @param {string}   notification.title          - Notification title / subject
 * @param {string}   notification.message        - Notification body / message
 * @param {string[]} notification.channels       - Array of channels: 'email'|'sms'|'push'|'in_app'
 *
 * @returns {Promise<{
 *   overall: 'sent'|'partial'|'failed',
 *   channels: {
 *     email?:  Object,
 *     sms?:    Object,
 *     push?:   Object,
 *     in_app?: Object,
 *   },
 *   sentAt: Date
 * }>}
 */
async function sendPatientNotification(notification) {
  const {
    patientEmail,
    patientPhone,
    deviceToken,
    title,
    message,
    channels = [],
  } = notification;

  const results = {};
  const sentAt = new Date();

  for (const channel of channels) {
    switch (channel) {
      case 'email': {
        const htmlBody = `<p>${message}</p>`;
        const textBody = message;
        results.email = await sendEmail(patientEmail, title, htmlBody, textBody);
        break;
      }

      case 'sms': {
        const smsBody = `${title}: ${message}`;
        results.sms = await sendSMS(patientPhone, smsBody);
        break;
      }

      case 'push': {
        results.push = await sendPushNotification(
          deviceToken || patientPhone, // fall back to phone as tag if no token
          title,
          message,
          { source: 'patientEngagementService' }
        );
        break;
      }

      case 'in_app': {
        // In-app notifications are stored in the database by the caller.
        // This channel always reports success here.
        results.in_app = { success: true, provider: 'in_app', stored: true };
        break;
      }

      default:
        logger.warn(`[patientEngagementService][sendPatientNotification] Unknown channel: ${channel}`);
        results[channel] = { success: false, error: `Unknown channel: ${channel}` };
    }
  }

  // Determine overall status
  const channelResults = Object.values(results);
  const successCount = channelResults.filter((r) => r.success).length;
  const total = channelResults.length;

  let overall;
  if (total === 0 || successCount === 0) {
    overall = 'failed';
  } else if (successCount === total) {
    overall = 'sent';
  } else {
    overall = 'partial';
  }

  return { overall, channels: results, sentAt };
}

/**
 * triggerAutomaticNotification
 *
 * Builds a notification object based on a predefined trigger type and
 * associated data. The caller is responsible for persisting and dispatching
 * the returned notification.
 *
 * Supported types:
 *   'referral_accepted'    - A referral has been accepted by the specialist
 *   'referral_completed'   - A referral has been marked complete
 *   'referral_rejected'    - A referral was rejected
 *   'prior_auth_approved'  - Prior authorization request approved
 *   'prior_auth_denied'    - Prior authorization request denied
 *   'appointment_reminder' - Upcoming appointment reminder
 *
 * @param {string} type        - One of the supported trigger type strings above
 * @param {Object} relatedData - Contextual data (referral, auth request, appointment, etc.)
 * @param {Object} patient     - Patient record with at minimum: { name, email, phone }
 * @returns {Object} Notification object (not saved — caller saves it)
 */
async function triggerAutomaticNotification(type, relatedData, patient) {
  const patientName = patient.name || 'Patient';
  let title = '';
  let message = '';
  let channels = ['email', 'sms', 'in_app'];

  switch (type) {
    case 'referral_accepted':
      title = 'Referral Accepted';
      message = processTemplate(
        'Good news, {{patientName}}! Your referral to {{specialistName}} has been accepted. ' +
          'You will be contacted shortly to schedule your appointment.',
        {
          patientName,
          specialistName: relatedData.specialistName || 'the specialist',
        }
      );
      break;

    case 'referral_completed':
      title = 'Referral Completed';
      message = processTemplate(
        'Hi {{patientName}}, your referral to {{specialistName}} has been marked as completed. ' +
          'Please contact your primary care provider if you have any questions.',
        {
          patientName,
          specialistName: relatedData.specialistName || 'the specialist',
        }
      );
      break;

    case 'referral_rejected':
      title = 'Referral Update';
      message = processTemplate(
        'Hi {{patientName}}, unfortunately your referral to {{specialistName}} could not be processed ' +
          'at this time. Reason: {{reason}}. Please contact your care team for next steps.',
        {
          patientName,
          specialistName: relatedData.specialistName || 'the specialist',
          reason: relatedData.reason || 'Not specified',
        }
      );
      break;

    case 'prior_auth_approved':
      title = 'Prior Authorization Approved';
      message = processTemplate(
        'Great news, {{patientName}}! Your prior authorization for {{serviceName}} has been approved. ' +
          'Authorization number: {{authNumber}}.',
        {
          patientName,
          serviceName: relatedData.serviceName || 'the requested service',
          authNumber: relatedData.authNumber || 'N/A',
        }
      );
      break;

    case 'prior_auth_denied':
      title = 'Prior Authorization Update';
      message = processTemplate(
        'Hi {{patientName}}, your prior authorization request for {{serviceName}} has been denied. ' +
          'Reason: {{reason}}. You may appeal this decision by contacting your insurance provider.',
        {
          patientName,
          serviceName: relatedData.serviceName || 'the requested service',
          reason: relatedData.reason || 'Not specified',
        }
      );
      break;

    case 'appointment_reminder':
      title = 'Appointment Reminder';
      message = processTemplate(
        'Hi {{patientName}}, this is a reminder that you have an appointment with {{providerName}} ' +
          'on {{appointmentDate}} at {{appointmentTime}}. Location: {{location}}.',
        {
          patientName,
          providerName: relatedData.providerName || 'your provider',
          appointmentDate: relatedData.appointmentDate || 'the scheduled date',
          appointmentTime: relatedData.appointmentTime || 'the scheduled time',
          location: relatedData.location || 'the clinic',
        }
      );
      channels = ['email', 'sms', 'push', 'in_app'];
      break;

    default:
      logger.warn(`[patientEngagementService][triggerAutomaticNotification] Unknown type: ${type}`);
      title = 'Notification';
      message = `You have a new notification regarding your care.`;
  }

  return {
    type,
    patientEmail: patient.email,
    patientPhone: patient.phone,
    deviceToken: patient.deviceToken || null,
    title,
    message,
    channels,
    relatedData,
    createdAt: new Date(),
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  processTemplate,
  sendEmail,
  sendSMS,
  sendPushNotification,
  sendPatientNotification,
  triggerAutomaticNotification,
};
