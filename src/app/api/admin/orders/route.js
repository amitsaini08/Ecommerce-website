import { NextResponse } from 'next/server';
import { routeHandler } from '../../routeHandler';
import { orderService } from '@/lib/services/orderService';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const paymentMethod = searchParams.get('paymentMethod');
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');

    const result = await orderService.getAdminOrders({
      page,
      limit,
      status,
      paymentStatus,
      paymentMethod,
      search,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
    });

    return NextResponse.json(result);
  },
});