import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generates a cryptographically secure random token and its SHA-256 hash.
 * The raw token is sent to the user (e.g. via email), while only the hash is stored in MongoDB.
 */
export const generateCryptoToken = (): { rawToken: string; tokenHash: string } => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashCryptoToken(rawToken);
  return { rawToken, tokenHash };
};

/**
 * Hashes a raw token with SHA-256 to compare with database records.
 */
export const hashCryptoToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
