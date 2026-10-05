import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Order, Product } from '@/lib/db/models';
import { AppError } from '@/app/api/routeHandler';
import { sameId } from '@/lib/utils';
import { notificationService } from './notificationService';

const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;
if (razorpayKeyId && razorpayKeySecret) {
  razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
}
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export const paymentService = {

  async verifyPayment(data) {
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

    const wasPaid = order.paymentStatus === 'paid';

    order.status = 'confirmed';
    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;

    order.statusHistory.push({
      status: 'confirmed',
      note: `Payment verified via client signature. Payment ID: ${razorpay_payment_id}`,
      changedAt: new Date(),
    });

    await order.save();

    if (!wasPaid) {
      notificationService.orderPlaced({ order });
    }

    return {
      orderId: String(order._id),
      message: 'Payment verified successfully! Order confirmed.',
    };
  },


  async retryPayment({ user, orderId }) {
    if (!orderId) throw new AppError('Order ID is required', 400);

    const order = await Order.findById(orderId);
    if (!order) throw new AppError('Order not found', 404);

    if (order.userId && !sameId(order.userId, user._id) && user.role !== 'admin') {
      throw new AppError('Unauthorized order access', 403);
    }

    if (order.status === 'cancelled') throw new AppError('Cannot pay for a cancelled order', 400);
    if (order.paymentStatus === 'paid') throw new AppError('This order is already paid', 400);
    if (order.paymentMethod !== 'razorpay') {
      throw new AppError('Payment retry is only available for online Razorpay orders', 400);
    }

    if (!razorpay) throw new AppError('Razorpay API keys not configured on server', 500);

    const amountInPaise = Math.round(Number(order.totalAmount) * 100);
    const orderIdStr = String(order._id);
    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `retry_${orderIdStr.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
    });

    order.razorpayOrderId = rzpOrder.id;
    await order.save();

    return {
      orderId: String(order._id),
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,
      totalAmount: order.totalAmount,
      key: razorpayKeyId,
    };
  },


  async handleWebhook({ rawBody, signature }) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) throw new AppError('Webhook secret not configured', 500);
    if (!signature) return { error: 'Missing signature', status: 400 };

    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    if (!safeEqual(expected, signature)) return { error: 'Invalid webhook signature', status: 400 };

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const razorpayOrderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id;

    if (!razorpayOrderId) {
      return { received: true, note: 'No order ID in payload' };
    }

    const order = await Order.findOne({ razorpayOrderId });
    if (!order) {
      return { received: true, note: 'Order not found' };
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

        notificationService.orderPlaced({ order });
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

        if (order.userId) {
          notificationService.notifySafe({
            userId: order.userId,
            type: 'payment',
            title: 'Payment failed',
            body: 'Your payment could not be completed. You can retry from your orders.',
            link: `/orders/${order._id}`,
          });
        }

        // for (const item of order.items || []) {
        //   await Product.updateOne(
        //     { _id: item.productId },
        //     { $inc: { stock: item.quantity } }
        //   );
        // }
      }
    }

    return { received: true };
  },
};
