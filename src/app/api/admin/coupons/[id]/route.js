import { NextResponse } from 'next/server';
import { couponSchema } from '@/lib/validations';
import { routeHandler } from '@/app/api/routeHandler';
import { couponService } from '@/lib/services/couponService';

export const PUT = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: couponSchema,
  handler: async (request, { params, data }) => {
    const { id } = await params;
    const result = await couponService.updateCoupon({ id, data });
    return NextResponse.json(result);
  },
});

export const DELETE = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const result = await couponService.deleteCoupon(id);
    return NextResponse.json(result);
  },
});