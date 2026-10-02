import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { Order, Product } from '@/lib/db/models';
import { routeHandler } from '@/app/api/routeHandler';

export const POST = routeHandler({
  auth: false,
  handler: async (request) => {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const razorpayOrderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id;

    if (!razorpayOrderId) {
      return NextResponse.json({ received: true, note: 'No order ID in payload' });
    }

    const order = await Order.findOne({ razorpayOrderId });
    if (!order) {
      return NextResponse.json({ received: true, note: 'Order not found' });
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      if (order.paymentStatus !== 'paid') {
        order.status = 'confirmed';
        order.paymentStatus = 'paid';
        order.razorpayPaymentId = paymentEntity?.id || order.razorpayPaymentId;
        order.statusHistory.push({
          status: 'confirmed',
          note: `Payment confirmed via webhook (${event}). Payment ID: ${paymentEntity?.id || 'N/A'}`,
          changedAt: new Date(),
        });
        await order.save();
      }
    }

    if (event === 'payment.failed') {
      if (order.paymentStatus === 'pending') {
        order.paymentStatus = 'failed';
        order.statusHistory.push({
          status: order.status,
          note: `Payment failed via webhook (${event}). Stock restored.`,
          changedAt: new Date(),
        });
        await order.save();

        for (const item of order.items || []) {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { stock: item.quantity } }
          );
        }
      }
    }

    return NextResponse.json({ received: true });
  },
});