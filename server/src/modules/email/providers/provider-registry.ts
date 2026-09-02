import { EmailProvider } from './email-provider.interface.js';
import { testEmailProvider } from './test-email.provider.js';
import { smtpEmailProvider } from './smtp-email.provider.js';
import { EMAIL_PROVIDER } from '../email.constants.js';

export const emailProviderRegistry = {
  getProvider(): EmailProvider {
    const configProvider = process.env.EMAIL_PROVIDER || EMAIL_PROVIDER.TEST;
    
    if (configProvider === EMAIL_PROVIDER.TEST) {
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_EMAIL_PROVIDER !== 'true') {
        throw new Error('TEST provider is disabled in production environments');
      }
      return testEmailProvider;
    }
    
    if (configProvider === EMAIL_PROVIDER.SMTP) {
      return smtpEmailProvider;
    }

    // Default fallback in development
    return testEmailProvider;
  }
};
