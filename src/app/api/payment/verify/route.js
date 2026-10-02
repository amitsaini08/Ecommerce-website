import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { z } from 'zod';
import { paymentService } from '@/lib/services/paymentService';

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  orderId: z.string().min(1),
});

export const POST = routeHandler({
  auth: true,
  rateLimit: { key: 'verify-payment', max: 3, windowSec: 10 * 60 },
  schema: verifyPaymentSchema,
  handler: async (request, { data }) => {
    const result = await paymentService.verifyPayment(data);
    return NextResponse.json(result);
  },
});