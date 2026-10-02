import { NextResponse } from 'next/server';
import { connectToDatabase, Coupon } from '@/lib/db/models';
import { couponSchema } from '@/lib/validations';
import { routeHandler } from '../../routeHandler';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const list = await Coupon.find().sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
    const count = await Coupon.countDocuments();
    return NextResponse.json({
      coupons: list,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  },
});

export const POST = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: couponSchema,
  handler: async (request, { data }) => {
    const { code, type, value, minOrderAmount, expiresAt, isActive } = data;

    await connectToDatabase();
    const newCoupon = await Coupon.create({
      code: code.toUpperCase(),
      type,
      value: Number(value),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: isActive !== false,
    });

    return NextResponse.json({ coupon: newCoupon.toObject() }, { status: 201 });
  }
});
