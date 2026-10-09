import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { consumeClientLogin } from '../services/client-login-consume';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  // Consume the token atomically (read + mark-used in one Firestore
  // transaction) so two concurrent redemptions cannot both succeed.
  const result = await consumeClientLogin(db, String(token));

  switch (result.status) {
    case 'OK':
      return res.status(200).json({
        success: true,
        clientId: result.clientId,
        email: result.email,
      });
    case 'INVALID':
      return res.status(400).json({ error: 'Link invalid' });
    case 'ALREADY_USED':
      return res.status(400).json({ error: 'Link already used' });
    case 'EXPIRED':
      return res.status(400).json({ error: 'Link expired' });
  }
}
