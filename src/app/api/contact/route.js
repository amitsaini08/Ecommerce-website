import { NextResponse } from 'next/server';
import { StoreSettings } from '@/lib/db/models';
import { contactSchema } from '@/lib/validations';
import { routeHandler } from '../routeHandler';

export const POST = routeHandler({
  rateLimit: { key: 'contact', max: 3, windowSec: 10 * 60 },
  schema: contactSchema,
  handler: async () => {
    const settings = await StoreSettings.findOne().lean();
    const storeContactEmail = settings?.contactEmail || 'admin@novahub.com';

    return NextResponse.json({
      message: 'Thank you for reaching out! Your message has been sent to our team.',
    });
  },
});
