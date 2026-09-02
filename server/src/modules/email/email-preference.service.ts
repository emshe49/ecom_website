import { EmailPreference } from './email-preference.model.js';

export const emailPreferenceService = {
  async getPreferences(userId: string) {
    let pref = await EmailPreference.findOne({ userId });
    if (!pref) {
      pref = await EmailPreference.create({ userId });
    }
    return pref;
  },

  async updatePreferences(userId: string, updates: any) {
    let pref = await EmailPreference.findOne({ userId });
    if (!pref) {
      pref = new EmailPreference({ userId, ...updates });
      await pref.save();
    } else {
      Object.assign(pref, updates);
      await pref.save();
    }
    return pref;
  },

  async shouldSendEmail(userId: string | undefined, category: string): Promise<boolean> {
    if (!userId) return true; // Guests can't opt out via user preferences
    
    // Critical emails cannot be opted out of
    if (['auth', 'security'].includes(category)) return true;

    const pref = await EmailPreference.findOne({ userId });
    if (!pref) return true; // Default true for transactional

    if (category === 'marketing') return pref.marketing;
    if (category === 'orders') return pref.orders;
    if (category === 'payments') return pref.payments;
    if (category === 'shipping') return pref.shipping;
    if (category === 'reviews') return pref.reviews;
    if (category === 'returns') return pref.returns;
    if (category === 'refunds') return pref.refunds;

    return true; // Default true for unknown transactional
  }
};
