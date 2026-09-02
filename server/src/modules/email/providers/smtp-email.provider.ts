import nodemailer from 'nodemailer';
import { EmailProvider } from './email-provider.interface.js';
import { SendEmailInput, EmailProviderResult } from '../email.types.js';

export class SmtpEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async send(input: SendEmailInput): Promise<EmailProviderResult> {
    try {
      const fromName = process.env.EMAIL_FROM_NAME || 'Store';
      const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@store.com';

      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: input.recipient,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });

      return {
        success: true,
        providerMessageId: info.messageId,
      };
    } catch (err: any) {
      return {
        success: false,
        failureCode: err.code || 'SMTP_ERROR',
        failureMessage: err.message || 'Unknown SMTP error',
      };
    }
  }
}

export const smtpEmailProvider = new SmtpEmailProvider();
