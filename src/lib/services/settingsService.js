import { StoreSettings } from '@/lib/db/models';

export const settingsService = {

  async getSettings() {
    const settings = await StoreSettings.findOne().lean();
    if (!settings) {
      return {
        settings: {
          storeName: 'NovaHub',
          contactEmail: 'admin@novahub.com',
          contactPhone: '+1 (555) 000-0000',
          codEnabled: true,
          shippingFee: 0,
          minFreeShipping: 50,
          whatsappNumber: '919876543210',
          codAdvanceAmount: 99,
        },
      };
    }
    return { settings };
  },

  
  async updateSettings(data) {
    let settings = await StoreSettings.findOne();

    if (!settings) {
      settings = new StoreSettings({
        storeName: data.storeName,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        codEnabled: data.codEnabled,
        shippingFee: data.shippingFee,
        minFreeShipping: data.minFreeShipping,
      });
    } else {
      settings.storeName = data.storeName;
      settings.contactEmail = data.contactEmail || null;
      settings.contactPhone = data.contactPhone || null;
      settings.codEnabled = data.codEnabled;
      settings.shippingFee = data.shippingFee;
      settings.minFreeShipping = data.minFreeShipping;
    }

    await settings.save();
    return { settings, message: 'Store settings updated successfully!' };
  },
};
