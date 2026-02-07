// Worker utility functions

import type { Env } from './types';

// Verify Discord signature using Web Crypto API
export const verifySignature = async (
  request: Request,
  env: Env,
): Promise<boolean> => {
  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');

  if (!signature || !timestamp) {
    return false;
  }

  const body = await request.clone().text();
  const message = timestamp + body;

  try {
    // Convert hex string to Uint8Array for Web Crypto API
    const keyBytes = new Uint8Array(
      env.DISCORD_PUBLIC_KEY.match(/.{1,2}/g)!.map((byte) =>
        parseInt(byte, 16),
      ),
    );
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );

    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      {
        name: 'Ed25519',
        namedCurve: 'Ed25519',
      },
      false,
      ['verify'],
    );

    const isValid = await crypto.subtle.verify(
      'Ed25519',
      key,
      signatureBytes,
      new TextEncoder().encode(message),
    );
    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};
