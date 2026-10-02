import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { orderService } from '@/lib/services/orderService';

export const GET = routeHandler({
  auth: true,
  handler: async (request, { user, params }) => {
    const { id } = await params;
    const result = await orderService.getOrderById({ user, orderId: id });
    return NextResponse.json(result);
  },
});