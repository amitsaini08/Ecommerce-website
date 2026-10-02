import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { Order } from '@/lib/db/models';
import { routeHandler, AppError } from '@/app/api/routeHandler';
import { sameId } from '@/lib/reviews';

const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;
if (razorpayKeyId && razorpayKeySecret) {
  razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
}

export const POST = routeHandler({
  auth: true,
  rateLimit: { key: 'retry-payment', max: 3, windowSec: 10 * 60 },
  handler: async (request, { user, params }) => {
    const { orderId } = await params;
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

    return NextResponse.json({
      orderId: String(order._id),
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,
      totalAmount: order.totalAmount,
      key: razorpayKeyId,
    });
  },
});