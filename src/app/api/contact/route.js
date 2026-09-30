import { NextResponse } from 'next/server';
import { connectToDatabase, StoreSettings } from '@/lib/db/models';
import { contactSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';
import { sendContactFormEmail } from '@/lib/email';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(`contact:${ip}`, 3, 10 * 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many messages sent. Please wait before submitting again.' },
        { status: 429 }
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const validation = parseAndValidate(contactSchema, rawBody);

    if (!validation.success) {
      const firstError = validation.errors[0];
      return NextResponse.json(
        {
          error: firstError?.message || 'Invalid form data',
          field: firstError?.field,
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const settings = await StoreSettings.findOne().lean();
    const storeContactEmail = settings?.contactEmail || 'admin@novahub.com';

    await sendContactFormEmail(storeContactEmail, validation.sanitizedData);

    return NextResponse.json({
      message: 'Thank you for reaching out! Your message has been sent to our team.',
    });
  } catch (error) {
    console.error('Contact form API error:', error);
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 });
  }
}
