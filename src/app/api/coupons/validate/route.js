import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { z } from 'zod';
import { couponService } from '@/lib/services/couponService';

const validateCouponSchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required'),
  subtotal: z.number().min(0),
});

export const POST = routeHandler({
  schema: validateCouponSchema,
  handler: async (request, { data }) => {
    const result = await couponService.validateCoupon(data);
    return NextResponse.json(result);
  },
});
