import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';
import { getFirebaseAdminApp } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, displayName } = body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    // Derive deterministic unique UID: 'usr_' + hex(email)[0..24]
    const emailHex = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
    const uid = `usr_${emailHex.substring(0, 24)}`;

    const adminApp = getFirebaseAdminApp();
    const adminAuth = getAuth(adminApp);

    const customToken = await adminAuth.createCustomToken(uid, {
      email: normalizedEmail,
      name: typeof displayName === 'string' ? displayName.trim() : '',
    });

    return NextResponse.json({
      success: true,
      customToken,
    });
  } catch (error: unknown) {
    console.error('Custom token generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate custom token.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
