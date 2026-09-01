import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../utils/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let transporter: nodemailer.Transporter | null = null;

if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });
}

const sendMail = async (options: EmailOptions): Promise<void> => {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      logger.info(`Email sent successfully to ${options.to}`, 'Email');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to deliver email to ${options.to}: ${message}`, 'Email');
    }
  } else {
    // Development fallback
    logger.info(`[DEV EMAIL] Outgoing email to: ${options.to} | Subject: "${options.subject}"`, 'Email');
    logger.info(`[DEV EMAIL] Content: ${options.text}`, 'Email');
  }
};

export const sendVerificationEmail = async (email: string, rawToken: string, firstName: string): Promise<void> => {
  const verificationUrl = `${env.CLIENT_URL}/verify-email?token=${rawToken}`;
  const subject = 'Verify your email address';
  const text = `Hello ${firstName},\n\nPlease verify your email address by clicking the link below:\n${verificationUrl}\n\nThis link will expire in 24 hours.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <h2 style="color: #4f46e5;">Verify Your Email Address</h2>
      <p>Hello ${firstName},</p>
      <p>Thank you for signing up for our e-commerce platform. Please confirm your email address by clicking the button below:</p>
      <div style="margin: 24px 0;">
        <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          Verify Email
        </a>
      </div>
      <p style="font-size: 12px; color: #64748b;">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p style="font-size: 12px; color: #94a3b8;">This verification link will expire in 24 hours.</p>
    </div>
  `;

  await sendMail({ to: email, subject, html, text });
};

export const sendPasswordResetEmail = async (email: string, rawToken: string, firstName: string): Promise<void> => {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
  const subject = 'Reset your password';
  const text = `Hello ${firstName},\n\nYou requested a password reset. Please click the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 30 minutes. If you did not make this request, please ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <h2 style="color: #4f46e5;">Password Reset Request</h2>
      <p>Hello ${firstName},</p>
      <p>We received a request to reset your password. You can reset it by clicking the button below:</p>
      <div style="margin: 24px 0;">
        <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 12px; color: #64748b;">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="font-size: 12px; color: #94a3b8;">This reset link will expire in 30 minutes. If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  await sendMail({ to: email, subject, html, text });
};
