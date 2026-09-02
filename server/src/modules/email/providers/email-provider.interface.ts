import { SendEmailInput, EmailProviderResult } from '../email.types.js';

export interface EmailProvider {
  send(input: SendEmailInput): Promise<EmailProviderResult>;
}
