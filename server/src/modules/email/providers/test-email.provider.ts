import { EmailProvider } from './email-provider.interface.js';
import { SendEmailInput, EmailProviderResult } from '../email.types.js';

export class TestEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<EmailProviderResult> {
    if (input.subject === 'FORCE_TEST_FAILURE') {
      return {
        success: false,
        failureCode: 'TEST_FAILURE_INJECTED',
        failureMessage: 'Test provider forced failure',
      };
    }
    
    return {
      success: true,
      providerMessageId: `test-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
  }
}

export const testEmailProvider = new TestEmailProvider();
