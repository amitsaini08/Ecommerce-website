import { NextResponse } from 'next/server';
import { createOrderSchema } from '@/lib/validations';
import { routeHandler } from '@/app/api/routeHandler';
import { orderService } from '@/lib/services/orderService';

export const POST = routeHandler({
  auth: true,
  schema: createOrderSchema,
  rateLimit: { key: 'create-order', max: 3, windowSec: 10 * 60 },
  handler: async (request, { user, data }) => {
    const result = await orderService.createOrder({ user, data });
    return NextResponse.json(result);
  },
});
