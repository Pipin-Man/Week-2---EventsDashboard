import crypto from 'crypto';

export function generateApiKey() {
  return `ed_${crypto.randomBytes(24).toString('hex')}`;
}
