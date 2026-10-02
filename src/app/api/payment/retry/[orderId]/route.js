import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { paymentService } from '@/lib/services/paymentService';

export const POST = routeHandler({
  auth: true,
  rateLimit: { key: 'retry-payment', max: 3, windowSec: 10 * 60 },
  handler: async (request, { user, params }) => {
    const { orderId } = await params;
    const result = await paymentService.retryPayment({ user, orderId });
    return NextResponse.json(result);
  },
});