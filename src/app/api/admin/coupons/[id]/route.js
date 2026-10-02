import { NextResponse } from 'next/server';
import { Coupon } from '@/lib/db/models';
import { couponSchema } from '@/lib/validations';
import { routeHandler, AppError } from '@/app/api/routeHandler';

export const PUT = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: couponSchema,
  handler: async (request, { params, data }) => {
    const { id } = await params;
    const coupon = await Coupon.findById(id);
    if (!coupon) throw new AppError('Coupon not found', 404);

    if (data.code) coupon.code = data.code.toUpperCase();
    if (data.type) coupon.type = data.type;
    if (data.value !== undefined) coupon.value = Number(data.value);
    if (data.minOrderAmount !== undefined) coupon.minOrderAmount = Number(data.minOrderAmount || 0);
    if (data.expiresAt !== undefined) coupon.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (data.isActive !== undefined) coupon.isActive = data.isActive;

    await coupon.save();
    return NextResponse.json({ coupon: coupon.toObject() });
  },
});

export const DELETE = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const res = await Coupon.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new AppError('Coupon not found', 404);
    return NextResponse.json({ message: 'Deleted' });
  },
});