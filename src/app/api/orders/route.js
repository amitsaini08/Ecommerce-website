import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { orderService } from '@/lib/services/orderService';

export const GET = routeHandler({
  auth: true,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const result = await orderService.getUserOrders({ user, page, limit });
    return NextResponse.json(result);
  },
});