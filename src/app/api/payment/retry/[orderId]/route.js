import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { connectToDatabase, Order } from '@/lib/db/models';
import { requireAuth } from '@/lib/auth';

const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;
if (razorpayKeyId && razorpayKeySecret) {
  razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });
}

export async function POST(request, { params }) {
  try {
    const user = await requireAuth(request);
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.userId && order.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized order access' }, { status: 403 });
    }

    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot pay for a cancelled order' }, { status: 400 });
    }

    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'This order is already paid' }, { status: 400 });
    }

    if (order.paymentMethod !== 'razorpay') {
      return NextResponse.json({ error: 'Payment retry is only available for online Razorpay orders' }, { status: 400 });
    }

    if (!razorpay) {
      return NextResponse.json(
        { error: 'Razorpay API keys not configured on server' },
        { status: 500 }
      );
    }

    const amountInPaise = Math.round(Number(order.totalAmount) * 100);

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `retry_${order._id.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
    });

    order.razorpayOrderId = rzpOrder.id;
    await order.save();

    return NextResponse.json({
      orderId: order._id,
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,
      totalAmount: order.totalAmount,
      key: razorpayKeyId,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Please login to retry payment' }, { status: 401 });
    }
    console.error('Payment retry error:', error);
    return NextResponse.json({ error: error.message || 'Failed to initiate payment retry' }, { status: 500 });
  }
}
