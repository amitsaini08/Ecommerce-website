import { NextResponse } from 'next/server';
import { couponSchema } from '@/lib/validations';
import { routeHandler } from '../../routeHandler';
import { couponService } from '@/lib/services/couponService';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await couponService.getCoupons({ page, limit });
    return NextResponse.json(result);
  },
});

export const POST = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: couponSchema,
  handler: async (request, { data }) => {
    const result = await couponService.createCoupon(data);
    return NextResponse.json(result, { status: 201 });
  },
});
