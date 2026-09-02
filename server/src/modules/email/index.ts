export { emailService } from './email.service.js';
export { EmailMessage } from './email-message.model.js';
export { EmailAttempt } from './email-attempt.model.js';
export { EmailPreference } from './email-preference.model.js';
export { EMAIL_STATUS, EMAIL_PROVIDER, EMAIL_ERROR_CODES } from './email.constants.js';
export { emailProviderRegistry } from './providers/provider-registry.js';
export { TestEmailProvider, testEmailProvider } from './providers/test-email.provider.js';
export { SmtpEmailProvider, smtpEmailProvider } from './providers/smtp-email.provider.js';
export { emailRendererService } from './email-renderer.service.js';
export { emailTemplateRegistry, TEMPLATES } from './email-template-registry.js';
export { emailPreferenceService } from './email-preference.service.js';
export { emailQueryService } from './email-query.service.js';
import emailRoutes from './email.routes.js';
import adminEmailRoutes from './admin-email.routes.js';

export { emailRoutes, adminEmailRoutes };
