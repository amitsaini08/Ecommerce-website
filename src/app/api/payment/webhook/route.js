import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { paymentService } from '@/lib/services/paymentService';

export const POST = routeHandler({
  auth: false,
  handler: async (request) => {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    const result = await paymentService.handleWebhook({ rawBody, signature });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  },
});