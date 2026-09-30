import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase, User } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { addressSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const dbUser = await User.findById(user.id).lean();

    const list = (dbUser?.addresses || []).map((a) => ({ ...a, id: a._id }));
    return NextResponse.json({ addresses: list });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rawBody = await request.json().catch(() => ({}));
    const validation = parseAndValidate(addressSchema, rawBody);

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

    const { label, line1, line2, city, state, pincode, phone } = validation.sanitizedData;

    await connectToDatabase();
    const dbUser = await User.findById(user.id);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newAddress = {
      _id: crypto.randomUUID(),
      label: label || null,
      line1,
      line2: line2 || null,
      city,
      state,
      pincode,
      phone: phone || null,
      createdAt: new Date(),
    };

    dbUser.addresses.push(newAddress);
    await dbUser.save();

    return NextResponse.json({ address: { ...newAddress, id: newAddress._id } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
  }
}
