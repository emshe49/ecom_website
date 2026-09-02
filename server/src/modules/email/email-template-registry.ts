import { z } from 'zod';

// Replace html special characters for basic safety
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type EmailTemplateDef<T> = {
  id: string;
  schema: z.ZodType<T>;
  subject: (data: T) => string;
  html: (data: T) => string;
  text: (data: T) => string;
};

// Generic Layouts
function layoutHtml(content: string) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: sans-serif; line-height: 1.5; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .footer { margin-top: 40px; font-size: 12px; color: #777; border-top: 1px solid #ddd; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        ${content}
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Our Store. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>
  `;
}

export const TEMPLATES = {
  AUTH_VERIFY_EMAIL: {
    id: 'AUTH_VERIFY_EMAIL',
    schema: z.object({ url: z.string().url() }),
    subject: () => 'Verify your email',
    html: (d: any) => layoutHtml(`<h1>Verify your email</h1><p>Use this link to verify your account: <a href="${d.url}">${d.url}</a></p>`),
    text: (d: any) => `Verify your email. Use this link to verify your account: ${d.url}`,
  },
  AUTH_PASSWORD_RESET: {
    id: 'AUTH_PASSWORD_RESET',
    schema: z.object({ url: z.string().url() }),
    subject: () => 'Reset your password',
    html: (d: any) => layoutHtml(`<h1>Reset your password</h1><p>Use this link to reset your password: <a href="${d.url}">${d.url}</a></p>`),
    text: (d: any) => `Reset your password. Use this link to reset your password: ${d.url}`,
  },
  ORDER_PLACED: {
    id: 'ORDER_PLACED',
    schema: z.object({
      orderNumber: z.string(),
      customerName: z.string(),
      total: z.number(),
      currency: z.string(),
      orderUrl: z.string().url()
    }),
    subject: (d: any) => `Order Confirmation: ${escapeHtml(d.orderNumber)}`,
    html: (d: any) => layoutHtml(`<h1>Order Placed</h1><p>Hi ${escapeHtml(d.customerName)}, your order <strong>${escapeHtml(d.orderNumber)}</strong> has been placed.</p><p>Total: ${d.total} ${d.currency}</p><p><a href="${d.orderUrl}">View Order</a></p>`),
    text: (d: any) => `Hi ${d.customerName}, your order ${d.orderNumber} has been placed. Total: ${d.total} ${d.currency}. View Order: ${d.orderUrl}`,
  },
  ORDER_CANCELLED: {
    id: 'ORDER_CANCELLED',
    schema: z.object({ orderNumber: z.string(), customerName: z.string() }),
    subject: (d: any) => `Order Cancelled: ${escapeHtml(d.orderNumber)}`,
    html: (d: any) => layoutHtml(`<h1>Order Cancelled</h1><p>Hi ${escapeHtml(d.customerName)}, your order <strong>${escapeHtml(d.orderNumber)}</strong> has been cancelled.</p>`),
    text: (d: any) => `Hi ${d.customerName}, your order ${d.orderNumber} has been cancelled.`,
  },
  PAYMENT_SUCCEEDED: {
    id: 'PAYMENT_SUCCEEDED',
    schema: z.object({ paymentNumber: z.string(), orderNumber: z.string(), amount: z.number(), currency: z.string() }),
    subject: (d: any) => `Payment Received for Order ${escapeHtml(d.orderNumber)}`,
    html: (d: any) => layoutHtml(`<h1>Payment Received</h1><p>We've received your payment of ${d.amount} ${d.currency} for order ${escapeHtml(d.orderNumber)}.</p>`),
    text: (d: any) => `We've received your payment of ${d.amount} ${d.currency} for order ${d.orderNumber}.`,
  },
  PAYMENT_FAILED: {
    id: 'PAYMENT_FAILED',
    schema: z.object({ paymentNumber: z.string(), orderNumber: z.string(), amount: z.number(), currency: z.string() }),
    subject: (d: any) => `Payment Failed for Order ${escapeHtml(d.orderNumber)}`,
    html: (d: any) => layoutHtml(`<h1>Payment Failed</h1><p>Your payment of ${d.amount} ${d.currency} for order ${escapeHtml(d.orderNumber)} failed. Please update your payment method.</p>`),
    text: (d: any) => `Your payment of ${d.amount} ${d.currency} for order ${d.orderNumber} failed. Please update your payment method.`,
  },
  SHIPMENT_SHIPPED: {
    id: 'SHIPMENT_SHIPPED',
    schema: z.object({ orderNumber: z.string(), carrier: z.string().optional(), trackingNumber: z.string().optional(), trackingUrl: z.string().optional() }),
    subject: (d: any) => `Your order ${escapeHtml(d.orderNumber)} has shipped!`,
    html: (d: any) => layoutHtml(`<h1>Order Shipped</h1><p>Your order ${escapeHtml(d.orderNumber)} is on its way!</p>${d.carrier ? `<p>Carrier: ${escapeHtml(d.carrier)}</p>` : ''}${d.trackingNumber ? `<p>Tracking: ${escapeHtml(d.trackingNumber)}</p>` : ''}${d.trackingUrl ? `<p><a href="${d.trackingUrl}">Track your package</a></p>` : ''}`),
    text: (d: any) => `Your order ${d.orderNumber} is on its way!${d.carrier ? ` Carrier: ${d.carrier}` : ''}${d.trackingNumber ? ` Tracking: ${d.trackingNumber}` : ''}${d.trackingUrl ? ` URL: ${d.trackingUrl}` : ''}`,
  },
  SHIPMENT_DELIVERED: {
    id: 'SHIPMENT_DELIVERED',
    schema: z.object({ orderNumber: z.string() }),
    subject: (d: any) => `Your order ${escapeHtml(d.orderNumber)} has been delivered!`,
    html: (d: any) => layoutHtml(`<h1>Order Delivered</h1><p>Your order ${escapeHtml(d.orderNumber)} has been delivered. Enjoy!</p>`),
    text: (d: any) => `Your order ${d.orderNumber} has been delivered. Enjoy!`,
  },
  REVIEW_HIDDEN: {
    id: 'REVIEW_HIDDEN',
    schema: z.object({ productName: z.string(), reason: z.string().optional() }),
    subject: () => `Your review was hidden`,
    html: (d: any) => layoutHtml(`<h1>Review Hidden</h1><p>Your review for ${escapeHtml(d.productName)} was hidden by a moderator.</p>${d.reason ? `<p>Reason: ${escapeHtml(d.reason)}</p>` : ''}`),
    text: (d: any) => `Your review for ${d.productName} was hidden by a moderator.${d.reason ? ` Reason: ${d.reason}` : ''}`,
  },
  REVIEW_REJECTED: {
    id: 'REVIEW_REJECTED',
    schema: z.object({ productName: z.string(), reason: z.string().optional() }),
    subject: () => `Your review was rejected`,
    html: (d: any) => layoutHtml(`<h1>Review Rejected</h1><p>Your review for ${escapeHtml(d.productName)} was rejected by a moderator.</p>${d.reason ? `<p>Reason: ${escapeHtml(d.reason)}</p>` : ''}`),
    text: (d: any) => `Your review for ${d.productName} was rejected by a moderator.${d.reason ? ` Reason: ${d.reason}` : ''}`,
  },
  RETURN_APPROVED: {
    id: 'RETURN_APPROVED',
    schema: z.object({ orderNumber: z.string() }),
    subject: (d: any) => `Return Approved for Order ${escapeHtml(d.orderNumber)}`,
    html: (d: any) => layoutHtml(`<h1>Return Approved</h1><p>Your return request for order ${escapeHtml(d.orderNumber)} has been approved.</p>`),
    text: (d: any) => `Your return request for order ${d.orderNumber} has been approved.`,
  },
  RETURN_REJECTED: {
    id: 'RETURN_REJECTED',
    schema: z.object({ orderNumber: z.string(), reason: z.string().optional() }),
    subject: (d: any) => `Return Rejected for Order ${escapeHtml(d.orderNumber)}`,
    html: (d: any) => layoutHtml(`<h1>Return Rejected</h1><p>Your return request for order ${escapeHtml(d.orderNumber)} was rejected.</p>${d.reason ? `<p>Reason: ${escapeHtml(d.reason)}</p>` : ''}`),
    text: (d: any) => `Your return request for order ${d.orderNumber} was rejected.${d.reason ? ` Reason: ${d.reason}` : ''}`,
  },
  RETURN_RECEIVED: {
    id: 'RETURN_RECEIVED',
    schema: z.object({ orderNumber: z.string() }),
    subject: (d: any) => `Return Received for Order ${escapeHtml(d.orderNumber)}`,
    html: (d: any) => layoutHtml(`<h1>Return Received</h1><p>We've received your returned items for order ${escapeHtml(d.orderNumber)}.</p>`),
    text: (d: any) => `We've received your returned items for order ${d.orderNumber}.`,
  },
  REFUND_SUCCEEDED: {
    id: 'REFUND_SUCCEEDED',
    schema: z.object({ orderNumber: z.string(), amount: z.number(), currency: z.string() }),
    subject: (d: any) => `Refund Processed for Order ${escapeHtml(d.orderNumber)}`,
    html: (d: any) => layoutHtml(`<h1>Refund Processed</h1><p>A refund of ${d.amount} ${d.currency} for order ${escapeHtml(d.orderNumber)} has been processed.</p>`),
    text: (d: any) => `A refund of ${d.amount} ${d.currency} for order ${d.orderNumber} has been processed.`,
  },
  REFUND_FAILED: {
    id: 'REFUND_FAILED',
    schema: z.object({ orderNumber: z.string(), amount: z.number(), currency: z.string() }),
    subject: (d: any) => `Refund Failed for Order ${escapeHtml(d.orderNumber)}`,
    html: (d: any) => layoutHtml(`<h1>Refund Failed</h1><p>We encountered an issue processing your refund of ${d.amount} ${d.currency} for order ${escapeHtml(d.orderNumber)}.</p>`),
    text: (d: any) => `We encountered an issue processing your refund of ${d.amount} ${d.currency} for order ${d.orderNumber}.`,
  }
};

export const emailTemplateRegistry = {
  getTemplate(id: string): EmailTemplateDef<any> {
    const t = (TEMPLATES as any)[id];
    if (!t) throw new Error(`Template not found: ${id}`);
    return t;
  }
};
