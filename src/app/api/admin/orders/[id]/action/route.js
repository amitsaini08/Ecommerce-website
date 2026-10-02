import { NextResponse } from 'next/server';
import { adminOrderActionSchema } from '@/lib/validations';
import { routeHandler } from '@/app/api/routeHandler';
import { orderService } from '@/lib/services/orderService';

export const POST = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: adminOrderActionSchema,
  handler: async (request, { params, data }) => {
    const { id } = await params;
    const { action, status, paymentStatus, reason } = data;
    const result = await orderService.adminOrderAction({ orderId: id, action, status, paymentStatus, reason });
    return NextResponse.json(result);
  },
});