import { EMAIL_STATUS, EMAIL_PROVIDER } from './email.constants.js';

export type EmailStatus = typeof EMAIL_STATUS[keyof typeof EMAIL_STATUS];
export type EmailProviderType = typeof EMAIL_PROVIDER[keyof typeof EMAIL_PROVIDER];

export interface EmailProviderResult {
  success: boolean;
  providerMessageId?: string;
  failureCode?: string;
  failureMessage?: string;
}

export interface SendEmailInput {
  recipient: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  deduplicationKey?: string;
}
