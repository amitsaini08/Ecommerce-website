import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase, StoreSettings } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';
import { storeSettingsSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';

export async function GET() {
  try {
    await connectToDatabase();
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

    return NextResponse.json({ settings: { ...settings, id: settings._id } });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await requireAdmin(request);
    const rawBody = await request.json().catch(() => ({}));
    const validation = parseAndValidate(storeSettingsSchema, rawBody);

    if (!validation.success) {
      const firstError = validation.errors[0];
      return NextResponse.json(
        {
          error: firstError?.message || 'Validation failed',
          field: firstError?.field,
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const { storeName, contactEmail, contactPhone, codEnabled, shippingFee, minFreeShipping } = validation.sanitizedData;
    const whatsappNumber = rawBody.whatsappNumber ? String(rawBody.whatsappNumber).trim() : '919876543210';
    const codAdvanceAmount = rawBody.codAdvanceAmount !== undefined ? Number(rawBody.codAdvanceAmount) : 99;

    await connectToDatabase();
    let settings = await StoreSettings.findOne();

    if (!settings) {
      settings = new StoreSettings({
        _id: crypto.randomUUID(),
        storeName,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        codEnabled,
        shippingFee,
        minFreeShipping,
        whatsappNumber,
        codAdvanceAmount,
      });
    } else {
      settings.storeName = storeName;
      settings.contactEmail = contactEmail || null;
      settings.contactPhone = contactPhone || null;
      settings.codEnabled = codEnabled;
      settings.shippingFee = shippingFee;
      settings.minFreeShipping = minFreeShipping;
      settings.whatsappNumber = whatsappNumber;
      settings.codAdvanceAmount = codAdvanceAmount;
      settings.updatedAt = new Date();
    }

    await settings.save();

    return NextResponse.json({ settings: { ...settings.toObject(), id: settings._id }, message: 'Store settings updated successfully!' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
