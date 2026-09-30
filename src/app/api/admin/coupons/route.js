import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase, Coupon } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';
import { couponSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    await connectToDatabase();
    const list = await Coupon.find()
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const count = await Coupon.countDocuments();
    return NextResponse.json({
      coupons: list.map((c) => ({ ...c, id: c._id })),
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await requireAdmin(request);
    const rawBody = await request.json().catch(() => ({}));
    const validation = parseAndValidate(couponSchema, rawBody);

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

    const { code, type, value, minOrderAmount, expiresAt, isActive } = validation.sanitizedData;

    await connectToDatabase();
    const newCoupon = await Coupon.create({
      _id: crypto.randomUUID(),
      code: code.toUpperCase(),
      type,
      value: Number(value),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: isActive !== false,
    });

    return NextResponse.json({ coupon: { ...newCoupon.toObject(), id: newCoupon._id } }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}
