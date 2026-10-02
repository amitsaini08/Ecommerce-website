import { NextResponse } from 'next/server';
import { returnOrderSchema } from '@/lib/validations';
import { routeHandler } from '@/app/api/routeHandler';
import { orderService } from '@/lib/services/orderService';

export const POST = routeHandler({
  auth: true,
  rateLimit: { key: 'return-order', max: 3, windowSec: 10 * 60 },
  schema: returnOrderSchema,
  handler: async (request, { user, params, data }) => {
    const { id } = await params;
    const { reason } = data;
    const result = await orderService.returnOrder({ user, orderId: id, reason });
    return NextResponse.json(result);
  },
});