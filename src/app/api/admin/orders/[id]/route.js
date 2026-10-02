import { NextResponse } from 'next/server';
import { adminOrderActionSchema } from '@/lib/validations';
import { routeHandler } from '@/app/api/routeHandler';
import { orderService } from '@/lib/services/orderService';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const result = await orderService.getAdminOrderById(id);
    return NextResponse.json(result);
  },
});

export const PATCH = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: adminOrderActionSchema,
  handler: async (request, { params, data }) => {
    const { id } = await params;
    const result = await orderService.updateAdminOrder({ id, data });
    return NextResponse.json(result);
  },
});