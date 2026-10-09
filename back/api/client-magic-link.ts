import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';
import { Resend } from 'resend';
import { buildMagicLinkEmail } from '../services/magic-link-email';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL || 'https://aibora.pt';

function generateSecureToken(): string {
  return randomBytes(24).toString('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailNormalized = String(email).toLowerCase();

    const snap = await db
      .collection('clients')
      .where('email', '==', emailNormalized)
      .where('category', '==', 'active')
      .where('response', '==', 'yes')
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({ error: 'Client not found or not active' });
    }

    const client = snap.docs[0].data();
    const clientId = snap.docs[0].id;
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.collection('client_logins').doc(token).set({
      clientId,
      token,
      email: emailNormalized,
      expiresAt: expiresAt.toISOString(),
      used: false,
      createdAt: new Date().toISOString(),
    });

    const html = buildMagicLinkEmail({
      name: client.name,
      email: email,
      appUrl: APP_URL,
      token,
    });

    const { error } = await resend.emails.send({
      from: 'Ai Bora <geral@aibora.pt>',
      to: [emailNormalized],
      subject: `Your client area access — Ai Bora`,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({
      success: true,
      message: 'Magic link sent to your email',
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}