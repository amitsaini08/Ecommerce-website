import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase, Order, Product } from '@/lib/db/models';
import { sendPaymentConfirmationEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.warn('[WEBHOOK] Invalid Razorpay webhook signature');
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

    await connectToDatabase();
    const order = await Order.findOne({ razorpayOrderId });

    if (!order) {
      console.warn(`[WEBHOOK] Order not found for Razorpay order: ${razorpayOrderId}`);
      return NextResponse.json({ received: true, note: 'Order not found' });
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      if (order.paymentStatus !== 'paid') {
        order.status = 'confirmed';
        order.paymentStatus = 'paid';
        order.razorpayPaymentId = paymentEntity?.id || order.razorpayPaymentId;

        order.statusHistory.push({
          _id: crypto.randomUUID(),
          status: 'confirmed',
          note: `Payment confirmed via webhook (${event}). Payment ID: ${paymentEntity?.id || 'N/A'}`,
          changedAt: new Date(),
        });

        await order.save();

        sendPaymentConfirmationEmail(paymentEntity?.email || 'customer', {
          ...order.toObject(),
          id: order._id,
          razorpayPaymentId: paymentEntity?.id,
        });
      }
    }

    if (event === 'payment.failed') {
      if (order.paymentStatus === 'pending') {
        order.paymentStatus = 'failed';

        order.statusHistory.push({
          _id: crypto.randomUUID(),
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
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
