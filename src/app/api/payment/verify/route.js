import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { Order } from '@/lib/db/models';
import { routeHandler, AppError } from '@/app/api/routeHandler';
import { z } from 'zod';

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = data;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new AppError('Invalid payment signature', 400);
    }

    const order = await Order.findById(orderId);
    if (!order) throw new AppError('Order not found', 404);

    order.status = 'confirmed';
    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;

    order.statusHistory.push({
      status: 'confirmed',
      note: `Payment verified via client signature. Payment ID: ${razorpay_payment_id}`,
      changedAt: new Date(),
    });

    await order.save();

    return NextResponse.json({
      orderId: String(order._id),
      message: 'Payment verified successfully! Order confirmed.',
    });
  },
});