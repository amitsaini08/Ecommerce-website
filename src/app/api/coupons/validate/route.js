import { NextResponse } from 'next/server';
import { Coupon } from '@/lib/db/models';
import { routeHandler, AppError } from '@/app/api/routeHandler';
import { z } from 'zod';

const validateCouponSchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required'),
  subtotal: z.number().min(0),
});

export const POST = routeHandler({
  schema: validateCouponSchema,
  handler: async (request, { data }) => {
    const { code, subtotal } = data;

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    }).lean();

    if (!coupon) throw new AppError('Invalid coupon code', 404);

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new AppError('This coupon has expired', 400);
    }

    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      throw new AppError(`Minimum order amount is ₹${coupon.minOrderAmount}`, 400);
    }

    const discountValue = coupon.type === 'percent'
      ? (subtotal * Number(coupon.value)) / 100
      : Math.min(Number(coupon.value), subtotal);

    return NextResponse.json({ coupon, discount: discountValue });
  },
});
