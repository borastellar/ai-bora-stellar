import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { timingSafeEqual } from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

const FOOTER = `
  <tr><td style="background:#1a1a1a;padding:32px 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr><td align="center" style="line-height:2.4;">
      <a href="https://aibora.pt/" style="font-size:12px;color:#888888;text-decoration:none;margin:0 8px;">About us</a>
      <span style="color:#444;">|</span>
      <a href="https://aibora.pt/servicos" style="font-size:12px;color:#888888;text-decoration:none;margin:0 8px;">Services</a>
      <span style="color:#444;">|</span>
      <a href="https://aibora.pt/privacidade" style="font-size:12px;color:#888888;text-decoration:none;margin:0 8px;">Privacy policy</a>
      <span style="color:#444;">|</span>
      <a href="https://aibora.pt/unsubscribe" style="font-size:12px;color:#888888;text-decoration:none;margin:0 8px;">Unsubscribe</a>
    </td></tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="padding:0 6px;"><a href="https://www.instagram.com/aibora.pt/" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;background:#E1306C;text-decoration:none;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a></td>
        <td style="padding:0 6px;"><a href="https://www.linkedin.com/company/aibora-pt" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;background:#0A66C2;text-decoration:none;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a></td>
        <td style="padding:0 6px;"><a href="https://x.com/boraweb3" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;background:#000000;text-decoration:none;border:1px solid #333;"><svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a></td>
        <td style="padding:0 6px;"><a href="https://www.facebook.com/aibora.pt/" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;background:#1877F2;text-decoration:none;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a></td>
        <td style="padding:0 6px;"><a href="https://www.youtube.com/@AiBora_pt" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;background:#FF0000;text-decoration:none;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a></td>
        <td style="padding:0 6px;"><a href="https://wa.me/351936021747" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;background:#25D366;text-decoration:none;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.162-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.173-.148.297-.297.446-.521.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.524-.05-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a></td>
      </tr></table>
    </td></tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
    <tr><td align="center">
      <p style="font-size:14px;color:#ffffff;text-align:center;margin:0 0 8px;">
        <a href="mailto:geral@aibora.pt" style="color:#ff6f2e;text-decoration:none;font-weight:500;">geral@aibora.pt</a>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="tel:+351936021747" style="color:#ffffff;text-decoration:none;">+351 936 021 747</a>
      </p>
    </td></tr></table>
    <p style="font-size:11px;color:#666666;text-align:center;margin:16px 0 0;">© 2026 Ai Bora. All rights reserved.</p>
  </td></tr>`;

const HEADER = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#e8e8e8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e8e8;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#1a1a1a;padding:28px 40px;text-align:center;">
  <img src="https://aibora.pt/logo.png" alt="Ai Bora" height="48" style="display:block;margin:0 auto;" />
</td></tr>
<tr><td style="height:4px;background:linear-gradient(90deg,#cb1a74 0%,#fb4a50 50%,#ff6f2e 100%);font-size:0;">&nbsp;</td></tr>`;

const CLOSE = `</table></td></tr></table></body></html>`;

function wrap(body: string): string {
  return HEADER + body + FOOTER + CLOSE;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Deep-escape user-supplied strings before they are interpolated into HTML templates.
function escapeTemplateData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return escapeHtml(data);
  if (Array.isArray(data)) return data.map(escapeTemplateData);
  if (typeof data === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) out[k] = escapeTemplateData(v);
    return out;
  }
  return data;
}

const rateBuckets = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

// Shared internal key gating this endpoint (same contract as /api/sign-and-submit).
// The endpoint is DISABLED (503) unless SEND_EMAIL_API_KEY is configured, so it is
// safe-by-default: no key on the server means nobody can use the relay.
const SEND_EMAIL_API_KEY = process.env.SEND_EMAIL_API_KEY || process.env.INTERNAL_API_KEY;

function isValidKey(provided: string | undefined): boolean {
  if (!SEND_EMAIL_API_KEY || !provided) return false;
  const expected = Buffer.from(SEND_EMAIL_API_KEY);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) {
    // Still run the comparison to keep timing uniform, then report failure.
    timingSafeEqual(expected, expected);
    return false;
  }
  return timingSafeEqual(expected, actual);
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

const templates: Record<string, (data: any) => { subject: string; html: string }> = {

  'proposal-link': (data) => ({
    subject: `✦ Your exclusive proposal is ready, ${data.clientName}`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Exclusive proposal ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.clientName} 👋</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">We prepared a proposal tailored to you and your project. View all details and share your feedback using the link below.</p>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 36px;">Questions? Reply to this email or contact us — we are here to help.</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 36px;">
          <a href="${data.proposalLink}" style="display:inline-block;padding:16px 52px;background:#ff6f2e;color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">View my proposal →</a>
        </td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
          <p style="font-size:12px;color:#999;margin:0 0 2px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Valid until</p>
          <p style="font-size:15px;color:#111;margin:0;font-weight:600;">${data.expiryDate}</p>
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'quote-confirmation': (data) => ({
    subject: `We received your quote request, ${data.clientName}!`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">📋 Request received</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.clientName}!</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">Thank you for your interest in Ai Bora. We received your quote request and our team is reviewing it.</p>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">Within <strong>2 business days</strong> you will receive a tailored proposal for your business needs.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
          <p style="font-size:12px;color:#999;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Request summary</p>
          <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>ID:</strong> ${data.requestId}</p>
          <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>Date:</strong> ${data.data}</p>
          ${data.projectType ? `<p style="font-size:14px;color:#111;margin:0;"><strong>Services:</strong> ${data.projectType}</p>` : ''}
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">We look forward to helping your business grow!</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'message-confirmation': (data) => ({
    subject: `Thank you for contacting us, ${data.clientName}!`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">👋 We received your message</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.clientName}!</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">Thank you for reaching out. We received your message and will review your request carefully.</p>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 36px;">Our team will get back to you within <strong>24 hours</strong>. In the meantime, if you have any questions, reply to this email or call us directly.</p>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">We look forward to helping!</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'collaborator-confirmation': (data) => ({
    subject: `We received your application, ${data.clientName}!`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✨ We received your application</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.clientName}!</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">Thank you for applying to join the Ai Bora network. We received your form and our team is reviewing your profile.</p>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">Within <strong>48 hours</strong> you will hear back about your application. If selected, you will receive detailed next steps.</p>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 36px;">Watch your inbox — we have many opportunities for you!</p>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">We look forward to working with you!</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'proposal-response': (data) => ({
    subject: `Response to proposal from ${data.clientName} — Ai Bora`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Response received ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;">Reply from ${data.clientName}</h1>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
          <p style="font-size:14px;color:#111;margin:0 0 8px;"><strong>Response:</strong> ${data.response}</p>
          ${data.comments ? `<p style="font-size:14px;color:#444;margin:0;"><strong>Comments:</strong> ${data.comments}</p>` : ''}
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'proposal-rejected': (data) => ({
    subject: `Thank you for your time — Ai Bora`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Until next time ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.clientName} 👋</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 36px;">Thank you for your time and for trusting us. We are here for any future questions — you are always welcome.</p>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'client-welcome': (data) => ({
    subject: `Welcome to Ai Bora, ${data.clientName}! 🎉`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Welcome ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.clientName} 🎉</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 36px;">It is official — you are now an active Ai Bora client! Access your personal profile anytime using the link below.</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 36px;">
          <a href="${data.recordLink}" style="display:inline-block;padding:16px 52px;background:#ff6f2e;color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">View my profile →</a>
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'new-collaborator-offers': (data) => ({
    subject: `✦ New tasks available — Ai Bora`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ New opportunity ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.collaboratorName} 👋</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 36px;">There are new tasks in the dashboard. Log in now and claim the ones you want before they are assigned.</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 36px;">
          <a href="${data.dashboardLink}" style="display:inline-block;padding:16px 52px;background:#ff6f2e;color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">View available tasks →</a>
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'task-assigned': (data) => ({
    subject: `New task assigned: ${data.nameTask} — Ai Bora`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Task assigned ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.collaboratorName} 👋</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">A new task has been assigned to you. Open the dashboard to see all details and get started.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
          <p style="font-size:12px;color:#999;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Details</p>
          <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>Task:</strong> ${data.nameTask}</p>
          <p style="font-size:14px;color:#111;margin:0;"><strong>Client:</strong> ${data.nameClient}</p>
        </td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 36px;">
          <a href="${data.dashboardLink}" style="display:inline-block;padding:16px 52px;background:#ff6f2e;color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">View my task →</a>
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'delivery-approved': (data) => ({
    subject: `Your delivery is ready to review — Ai Bora`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Delivery ready ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.clientName} 👋</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 36px;">Your delivery is ready! Review the work and approve it using the link below.</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 36px;">
          <a href="${data.deliveryLink}" style="display:inline-block;padding:16px 52px;background:#ff6f2e;color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">Review and approve delivery →</a>
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'invoice': (data) => ({
    subject: `Your Ai Bora invoice — ${data.amount}€`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Invoice available ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.clientName} 👋</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">Here is your invoice for the contracted services. You can pay using the link below.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
          <p style="font-size:12px;color:#999;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Summary</p>
          <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>Amount:</strong> ${data.amount}€</p>
          <p style="font-size:14px;color:#111;margin:0;"><strong>Due date:</strong> ${data.dueDate}</p>
        </td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 36px;">
          <a href="${data.invoiceLink}" style="display:inline-block;padding:16px 52px;background:#ff6f2e;color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">Pay now →</a>
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'executor-settlement': (data) => ({
    subject: `Your commission is ready — Ai Bora`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Commission ready ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.collaboratorName} 👋</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">Your commission for the work completed is ready. Details below.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
          <p style="font-size:12px;color:#999;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Details</p>
          <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>Task:</strong> ${data.nameTask}</p>
          <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>Commission:</strong> ${data.amount}€</p>
          <p style="font-size:14px;color:#111;margin:0;"><strong>Date:</strong> ${data.data}</p>
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'sales-rep-settlement': (data) => ({
    subject: `Your referral commission is ready — Ai Bora`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Referral commission ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.collaboratorName} 👋</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">Your commission for referring this client is ready. Details below.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
          <p style="font-size:12px;color:#999;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Details</p>
          <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>Referred client:</strong> ${data.nameClient}</p>
          <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>Commission:</strong> ${data.amount}€</p>
          <p style="font-size:14px;color:#111;margin:0;"><strong>Date:</strong> ${data.data}</p>
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'payment-confirmed': (data) => ({
    subject: `Payment confirmed — Thank you, ${data.clientName}!`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Payment confirmed ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Thank you, ${data.clientName}! 🙏</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 36px;">We received your payment successfully. You can view all details in your personal profile.</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 36px;">
          <a href="${data.recordLink}" style="display:inline-block;padding:16px 52px;background:#ff6f2e;color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">View my profile →</a>
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'commission-sent-executor': (data) => ({
    subject: `Your commission has been sent — Ai Bora`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Commission sent ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.collaboratorName} 👋</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">Your commission was processed and sent successfully.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
          <p style="font-size:12px;color:#999;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Details</p>
          <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>Task:</strong> ${data.nameTask}</p>
          <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>Amount sent:</strong> ${data.amount}€</p>
          <p style="font-size:14px;color:#111;margin:0;"><strong>Date:</strong> ${data.data}</p>
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'commission-sent-sales-rep': (data) => ({
    subject: `Your sales commission has been sent — Ai Bora`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Sales commission sent ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.collaboratorName} 👋</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">Your client-referral commission was processed and sent successfully.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
          <p style="font-size:12px;color:#999;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Details</p>
          <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>Referred client:</strong> ${data.nameClient}</p>
          <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>Amount sent:</strong> ${data.amount}€</p>
          <p style="font-size:14px;color:#111;margin:0;"><strong>Date:</strong> ${data.data}</p>
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'new-collaborator-admin': (data) => ({
    subject: `New collaborator registered — ${data.salesRepName}`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ New Collaborator ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;">New collaborator registered</h1>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
          <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>Name:</strong> ${data.salesRepName}</p>
          <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>Email:</strong> ${data.salesRepEmail}</p>
          <p style="font-size:14px;color:#111;margin:0;"><strong>Date:</strong> ${data.registrationDate}</p>
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 40px;">Access the admin panel to approve this collaborator.</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'collaborator-access': (data) => ({
    subject: `Your Ai Bora access is ready`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Access Approved ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Welcome, ${data.salesRepName}! 🎉</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">Your access to the Ai Bora platform has been approved. Use the button below to sign in.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
          <p style="font-size:14px;color:#111;margin:0;"><strong>Email:</strong> ${data.email}</p>
        </td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 36px;">
          <a href="${data.loginLink}" style="display:inline-block;padding:16px 52px;background:#ff6f2e;color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">Sign in to the platform →</a>
        </td></tr></table>
        <p style="font-size:13px;color:#888;margin:0 0 36px;">Use "Forgot password" to set your initial password.</p>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'marketing-campaign': (data) => ({
    subject: data.title,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Ai Bora ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">${data.title}</h1>
        ${data.recipientName ? `<p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">Hello, ${data.recipientName}!</p>` : ''}
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 36px;">${data.message}</p>
        ${data.link ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 36px;"><a href="${data.link}" style="display:inline-block;padding:16px 52px;background:#ff6f2e;color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">Learn more →</a></td></tr></table>` : ''}
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'change-request': (data) => ({
    subject: `🔄 ${data.clientName} requested changes to the proposal`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">🔄 Changes Requested</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;">Change request</h1>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
          <p style="font-size:14px;color:#111;margin:0 0 8px;"><strong>Client:</strong> ${data.clientName}</p>
          <p style="font-size:14px;color:#111;margin:0 0 8px;"><strong>Company:</strong> ${data.company || 'Not specified'}</p>
          <p style="font-size:14px;color:#111;margin:0;"><strong>Proposal ID:</strong> ${data.proposalId}</p>
        </td></tr></table>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 36px;">The client requested changes to the proposal. Please contact the client to discuss the required adjustments.</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 36px;">
          <a href="${data.proposalLink}" style="display:inline-block;padding:16px 52px;background:#ff6f2e;color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">Edit proposal →</a>
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'proposal-response-confirmation': (data) => ({
    subject: `We received your response, ${data.clientName}`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">✦ Response Recorded ✦</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${data.clientName} 👋</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">Thank you for your response. We have recorded your preference:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
          <p style="font-size:14px;color:#111;margin:0;"><strong>Your response:</strong> ${data.response}</p>
        </td></tr></table>
        ${data.recordUrl ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 36px;">
          <a href="${data.recordUrl}" style="display:inline-block;padding:16px 52px;background:#ff6f2e;color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">Go to my area →</a>
        </td></tr></table>` : ''}
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  }),

  'certificate-issued': (data) => ({
    subject: `🎉 AI BORA Academy Certificate - ${data.trackName}`,
    html: wrap(`
      <tr><td style="padding:48px 40px 16px;">
        <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">🏆 Certificate Earned</p>
        <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Congratulations, ${data.studentName}! 🎉</h1>
        <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">You have successfully completed the <strong>${data.trackName}</strong> track. Your certificate is available!</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
          <p style="font-size:14px;color:#111;margin:0 0 8px;"><strong>Track:</strong> ${data.trackName}</p>
          <p style="font-size:14px;color:#111;margin:0 0 8px;"><strong>Completion Date:</strong> ${data.completionDate}</p>
          <p style="font-size:14px;color:#111;margin:0;"><strong>Verification Code:</strong> ${data.codeVerification}</p>
        </td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 36px;">
          <a href="${data.linkVerification}" style="display:inline-block;padding:16px 52px;background:#ff6f2e;color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">View my certificate →</a>
        </td></tr></table>
        <p style="font-size:15px;color:#444;margin:0 0 8px;">Share your achievement on LinkedIn!</p>
        <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The AI BORA Academy team 📚</p>
      </td></tr>
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>`)
  })

};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: this endpoint sends mail from the company domain via the server's
  // RESEND_API_KEY. Require an authenticated caller first (shared internal key,
  // same contract as /api/sign-and-submit). Disabled by default: with no key
  // configured the endpoint refuses to run, so the open relay is closed.
  if (!SEND_EMAIL_API_KEY) {
    return res.status(503).json({
      error: 'Endpoint disabled',
      message: 'SEND_EMAIL_API_KEY is not configured on the server.',
    });
  }
  const providedKey =
    (req.headers['x-api-key'] as string | undefined) ??
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
  if (!isValidKey(providedKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { to, templateId, templateData } = req.body;
    if (!to || !templateId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (typeof to !== 'string' || !to.includes('@')) {
      return res.status(400).json({ error: 'Invalid recipient email' });
    }
    if (typeof templateId !== 'string' || !templates[templateId]) {
      return res.status(400).json({ error: 'Template not found' });
    }

    // Secondary control: per-IP rate limit on top of the shared-key auth above.
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      return res.status(429).json({ error: 'Too many requests — slow down' });
    }

    const template = templates[templateId];
    const { subject, html } = template(escapeTemplateData(templateData));
    const { data, error } = await resend.emails.send({
      from: 'Ai Bora <geral@aibora.pt>',
      to: [to],
      subject,
      html,
    });
    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }
    return res.status(200).json({ success: true, id: data?.id });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
