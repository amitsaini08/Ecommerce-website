import { NextResponse } from 'next/server';
import { StoreSettings } from '@/lib/db/models';
import { storeSettingsSchema } from '@/lib/validations';
import { routeHandler } from '@/app/api/routeHandler';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async () => {
    const settings = await StoreSettings.findOne().lean();
    if (!settings) {
      return NextResponse.json({
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
      });
    }
    return NextResponse.json({ settings });
  },
});

export const PUT = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: storeSettingsSchema,
  handler: async (request, { data }) => {
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
    return NextResponse.json({ settings, message: 'Store settings updated successfully!' });
  },
});
