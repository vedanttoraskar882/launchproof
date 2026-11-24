/**
 * LaunchProof Serverless Form Submission Handler
 * Compatible with Vercel Serverless Functions and local Vite middleware
 */

// Simple in-memory rate limiting map: IP -> array of timestamps
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

/**
 * Basic in-memory rate limiter
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return true;
}

/**
 * HTML Escaping helper to prevent HTML injection in emails
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate email address format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim()) && email.length <= 150;
}

/**
 * Core form processing function
 */
export async function processSubmission(payload, clientIp = '127.0.0.1') {
  // 1. Rate limiting check
  if (!checkRateLimit(clientIp)) {
    return {
      status: 429,
      data: { success: false, error: 'Too many requests. Please wait a minute and try again.' }
    };
  }

  // 2. Honeypot check for spam protection
  if (payload._hp || payload.website) {
    // Spam bot filled honeypot: fail gracefully with generic error
    return {
      status: 400,
      data: { success: false, error: 'Invalid submission detected.' }
    };
  }

  const submissionType = payload.type || 'early-access';

  // 3. Server-generated submission timestamp (Europe/London timezone)
  const now = new Date();
  const serverTimestamp = now.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'full',
    timeStyle: 'long'
  });

  let subject = '';
  let plainTextBody = '';
  let htmlBody = '';
  let replyToEmail = '';

  if (submissionType === 'early-access') {
    const fullName = String(payload.fullName || '').trim();
    const phoneNumber = String(payload.phoneNumber || '').trim();
    const emailAddress = String(payload.emailAddress || '').trim();
    const organisationName = String(payload.organisationName || '').trim();

    // Required fields check
    if (!fullName || !phoneNumber || !emailAddress || !organisationName) {
      return {
        status: 400,
        data: { success: false, error: 'Please complete all required fields.' }
      };
    }

    if (!isValidEmail(emailAddress)) {
      return {
        status: 400,
        data: { success: false, error: 'Please provide a valid email address.' }
      };
    }

    if (fullName.length > 100 || phoneNumber.length > 30 || organisationName.length > 150) {
      return {
        status: 400,
        data: { success: false, error: 'Field input exceeds maximum allowed length.' }
      };
    }

    replyToEmail = emailAddress;
    subject = 'LaunchProof — Early Access Registration';

    plainTextBody = [
      'LAUNCHPROOF — EARLY ACCESS REGISTRATION',
      '======================================',
      '',
      `Submission Type: Early Access Registration`,
      `Submission Date/Time: ${serverTimestamp}`,
      '',
      `Full Name: ${fullName}`,
      `Email Address: ${emailAddress}`,
      `Phone Number: ${phoneNumber}`,
      `Organisation Name: ${organisationName}`,
      '',
      '--------------------------------------',
      'Sent via LaunchProof early-access registration endpoint.'
    ].join('\n');

    htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0; border-bottom: 2px solid #4f46e5; padding-bottom: 12px;">LaunchProof — Early Access Registration</h2>
        <p style="color: #475569; font-size: 14px;">A new early-access registration was submitted on LaunchProof.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: 600; color: #334155; width: 160px;">Submission Date/Time:</td>
            <td style="padding: 10px 0; color: #0f172a;">${escapeHtml(serverTimestamp)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: 600; color: #334155;">Full Name:</td>
            <td style="padding: 10px 0; color: #0f172a;">${escapeHtml(fullName)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: 600; color: #334155;">Email Address:</td>
            <td style="padding: 10px 0; color: #0f172a;"><a href="mailto:${escapeHtml(emailAddress)}" style="color: #4f46e5;">${escapeHtml(emailAddress)}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: 600; color: #334155;">Phone Number:</td>
            <td style="padding: 10px 0; color: #0f172a;">${escapeHtml(phoneNumber)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: 600; color: #334155;">Organisation Name:</td>
            <td style="padding: 10px 0; color: #0f172a;">${escapeHtml(organisationName)}</td>
          </tr>
        </table>
        
        <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
          Reply directly to this email to contact the registrant.
        </p>
      </div>
    `;

  } else if (submissionType === 'contact') {
    const fullName = String(payload.fullName || '').trim();
    const emailAddress = String(payload.emailAddress || '').trim();
    const phoneNumber = String(payload.phoneNumber || '').trim();
    const organisationName = String(payload.organisationName || '').trim();
    const enquirySubject = String(payload.subject || '').trim();
    const message = String(payload.message || '').trim();

    // Required fields check for contact enquiry
    if (!fullName || !emailAddress || !enquirySubject || !message) {
      return {
        status: 400,
        data: { success: false, error: 'Please complete all required fields (Name, Email, Subject, Message).' }
      };
    }

    if (!isValidEmail(emailAddress)) {
      return {
        status: 400,
        data: { success: false, error: 'Please provide a valid email address.' }
      };
    }

    if (fullName.length > 100 || enquirySubject.length > 200 || message.length > 5000) {
      return {
        status: 400,
        data: { success: false, error: 'Message or input exceeds maximum allowed length.' }
      };
    }

    replyToEmail = emailAddress;
    subject = 'LaunchProof — Contact Enquiry';

    plainTextBody = [
      'LAUNCHPROOF — CONTACT ENQUIRY',
      '============================',
      '',
      `Submission Type: Contact Enquiry`,
      `Submission Date/Time: ${serverTimestamp}`,
      '',
      `Full Name: ${fullName}`,
      `Email Address: ${emailAddress}`,
      `Phone Number: ${phoneNumber || 'Not provided'}`,
      `Organisation Name: ${organisationName || 'Not provided'}`,
      `Subject: ${enquirySubject}`,
      '',
      'Message:',
      message,
      '',
      '--------------------------------------',
      'Sent via LaunchProof contact form endpoint.'
    ].join('\n');

    htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0; border-bottom: 2px solid #4f46e5; padding-bottom: 12px;">LaunchProof — Contact Enquiry</h2>
        <p style="color: #475569; font-size: 14px;">A new enquiry was submitted through the contact form.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: 600; color: #334155; width: 160px;">Submission Date/Time:</td>
            <td style="padding: 10px 0; color: #0f172a;">${escapeHtml(serverTimestamp)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: 600; color: #334155;">Full Name:</td>
            <td style="padding: 10px 0; color: #0f172a;">${escapeHtml(fullName)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: 600; color: #334155;">Email Address:</td>
            <td style="padding: 10px 0; color: #0f172a;"><a href="mailto:${escapeHtml(emailAddress)}" style="color: #4f46e5;">${escapeHtml(emailAddress)}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: 600; color: #334155;">Phone Number:</td>
            <td style="padding: 10px 0; color: #0f172a;">${escapeHtml(phoneNumber) || '<em>Not provided</em>'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: 600; color: #334155;">Organisation Name:</td>
            <td style="padding: 10px 0; color: #0f172a;">${escapeHtml(organisationName) || '<em>Not provided</em>'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; font-weight: 600; color: #334155;">Subject:</td>
            <td style="padding: 10px 0; color: #0f172a;"><strong>${escapeHtml(enquirySubject)}</strong></td>
          </tr>
        </table>
        
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; border-left: 4px solid #4f46e5; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0; color: #334155; font-size: 14px;">Message:</h4>
          <p style="margin: 0; color: #0f172a; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${escapeHtml(message)}</p>
        </div>
        
        <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
          Reply directly to this email to respond to the enquiry.
        </p>
      </div>
    `;

  } else {
    return {
      status: 400,
      data: { success: false, error: 'Unknown submission type.' }
    };
  }

  // 4. Dispatch Email to Business Email
  const businessEmail = process.env.BUSINESS_EMAIL;
  const resendApiKey = process.env.RESEND_API_KEY;
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
  const emailFrom = process.env.EMAIL_FROM || 'LaunchProof Notifications <notifications@launchproof.co.uk>';

  // Check if test / simulation mode is active
  if (process.env.NODE_ENV === 'test' || process.env.EMAIL_TEST_MODE === 'true') {
    return {
      status: 200,
      data: {
        success: true,
        message: 'Submission received and email delivered (test mode).',
        timestamp: serverTimestamp
      }
    };
  }

  // Missing Business Email check
  if (!businessEmail) {
    console.error('[LaunchProof Email] Missing BUSINESS_EMAIL environment variable.');
    return {
      status: 503,
      data: {
        success: false,
        error: 'Email delivery is currently unconfigured. The owner must set the BUSINESS_EMAIL environment variable.'
      }
    };
  }

  // Provider Dispatch: Resend (Recommended)
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [businessEmail],
          reply_to: replyToEmail,
          subject: subject,
          text: plainTextBody,
          html: htmlBody
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        console.error('[LaunchProof Resend Error]', resData);
        return {
          status: 502,
          data: { success: false, error: resData.message || 'Email delivery failed with transactional provider.' }
        };
      }

      return {
        status: 200,
        data: { success: true, message: 'Submission delivered successfully.', id: resData.id }
      };
    } catch (err) {
      console.error('[LaunchProof Resend Network Error]', err);
      return {
        status: 502,
        data: { success: false, error: 'Network error connecting to email service provider.' }
      };
    }
  }

  // Provider Dispatch: SendGrid
  if (sendgridApiKey) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: businessEmail }] }],
          from: { email: emailFrom.replace(/.*<([^>]+)>.*/, '$1') || 'notifications@launchproof.co.uk' },
          reply_to: { email: replyToEmail },
          subject: subject,
          content: [
            { type: 'text/plain', value: plainTextBody },
            { type: 'text/html', value: htmlBody }
          ]
        })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[LaunchProof SendGrid Error]', text);
        return {
          status: 502,
          data: { success: false, error: 'Email delivery failed with SendGrid.' }
        };
      }

      return {
        status: 200,
        data: { success: true, message: 'Submission delivered successfully.' }
      };
    } catch (err) {
      console.error('[LaunchProof SendGrid Network Error]', err);
      return {
        status: 502,
        data: { success: false, error: 'Network error connecting to email service provider.' }
      };
    }
  }

  // Provider Dispatch: Postmark
  if (postmarkToken) {
    try {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': postmarkToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          From: emailFrom,
          To: businessEmail,
          ReplyTo: replyToEmail,
          Subject: subject,
          TextBody: plainTextBody,
          HtmlBody: htmlBody
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        console.error('[LaunchProof Postmark Error]', resData);
        return {
          status: 502,
          data: { success: false, error: resData.Message || 'Email delivery failed with Postmark.' }
        };
      }

      return {
        status: 200,
        data: { success: true, message: 'Submission delivered successfully.' }
      };
    } catch (err) {
      console.error('[LaunchProof Postmark Network Error]', err);
      return {
        status: 502,
        data: { success: false, error: 'Network error connecting to email service provider.' }
      };
    }
  }

  // No email provider key configured
  console.error('[LaunchProof Email] No transactional email provider key configured (RESEND_API_KEY, SENDGRID_API_KEY, or POSTMARK_SERVER_TOKEN).');
  return {
    status: 503,
    data: {
      success: false,
      error: 'Email delivery provider is pending setup. Please set RESEND_API_KEY (or SENDGRID_API_KEY / POSTMARK_SERVER_TOKEN).'
    }
  };
}

/**
 * Standard Vercel Serverless Function Handler
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  let payload = req.body;

  // Parse JSON if needed
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Invalid JSON payload.' });
    }
  }

  const result = await processSubmission(payload, clientIp);
  return res.status(result.status).json(result.data);
}
