import { emailTemplateRegistry } from './email-template-registry.js';
import { EMAIL_ERROR_CODES } from './email.constants.js';

export const emailRendererService = {
  render(templateId: string, data: any): { subject: string; html: string; text: string } {
    try {
      const template = emailTemplateRegistry.getTemplate(templateId);
      const parsedData = template.schema.parse(data);

      return {
        subject: template.subject(parsedData),
        html: template.html(parsedData),
        text: template.text(parsedData),
      };
    } catch (err: any) {
      if (err.name === 'ZodError') {
        const error = new Error(`Template data validation failed: ${err.message}`);
        (error as any).code = EMAIL_ERROR_CODES.ERR_EMAIL_TEMPLATE_DATA_INVALID;
        throw error;
      }
      const error = new Error(`Template not found or render failed: ${err.message}`);
      (error as any).code = EMAIL_ERROR_CODES.ERR_EMAIL_TEMPLATE_NOT_FOUND;
      throw error;
    }
  }
};
