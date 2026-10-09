// Builds the client-area magic-link email body.
//
// client-magic-link.ts (back/api) interpolates user-supplied strings
// (client.name, the client email) straight into an HTML template. send-email.ts
// already escapes its own inputs (escapeHtml); this builder applies the same
// guarantee to the magic-link email so a name like "<img onerror=...>" cannot
// inject markup into a message sent from the aibora.pt domain.
//
// Kept as a pure function so it is testable without Firestore/Resend:
//   import { buildMagicLinkEmail } from './magic-link-email.ts';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface MagicLinkEmailInput {
  name: unknown;
  email: unknown;
  appUrl?: string;
  token: string;
}

export function buildMagicLinkEmail(input: MagicLinkEmailInput): string {
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const appUrl = (input.appUrl || 'https://aibora.pt').replace(/"/g, '&quot;');
  const loginLink = `${appUrl}/client/login/${input.token}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#e8e8e8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e8e8;padding:32px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
  <tr><td style="background:#1a1a1a;padding:28px 40px;text-align:center;">
    <img src="https://aibora.pt/logo.png" alt="Ai Bora" height="48" style="display:block;margin:0 auto;" />
  </td></tr>
  <tr><td style="height:4px;background:linear-gradient(90deg,#cb1a74 0%,#fb4a50 50%,#ff6f2e 100%);font-size:0;">&nbsp;</td></tr>
  <tr><td style="padding:48px 40px 16px;">
    <p style="font-size:12px;font-weight:700;color:#ff6f2e;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">🔐 Client area access</p>
    <h1 style="font-size:26px;font-weight:700;color:#111;margin:0 0 20px;line-height:1.25;">Hello, ${name} 👋</h1>
    <p style="font-size:15px;color:#444;line-height:1.75;margin:0 0 16px;">You requested access to your client area. Click the button below to sign in.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;"><tr><td style="background:#fafafa;border-left:3px solid #ff6f2e;border-radius:0 8px 8px 0;padding:18px 22px;">
      <p style="font-size:14px;color:#111;margin:0 0 4px;"><strong>Client:</strong> ${name}</p>
      <p style="font-size:14px;color:#111;margin:0;"><strong>Email:</strong> ${email}</p>
    </td></tr></table>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 36px;">
      <a href="${loginLink}" style="display:inline-block;padding:16px 52px;background:#ff6f2e;color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">Go to my area →</a>
    </td></tr></table>
    <p style="font-size:13px;color:#888;margin:0 0 36px;">⚠️ This link is valid for 24 hours. If you did not request access, ignore this email.</p>
    <p style="font-size:15px;color:#444;margin:0 0 4px;">Best regards,</p>
    <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 40px;">The Ai Bora team 💞</p>
  </td></tr>
  </table></td></tr></table>
</body>
</html>`;
}
