import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase, Order, Product } from '@/lib/db/models';
import { requireAuth } from '@/lib/auth';
import { sendOrderConfirmationEmail, sendPaymentConfirmationEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } =
      await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return NextResponse.json({ error: 'Missing required payment parameters' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    await connectToDatabase();
    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    order.status = 'confirmed';
    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;

    order.statusHistory.push({
      _id: crypto.randomUUID(),
      status: 'confirmed',
      note: `Payment verified via client signature. Payment ID: ${razorpay_payment_id}`,
      changedAt: new Date(),
    });

    await order.save();

    const productIds = (order.items || []).map((i) => i.productId);
    const productsList = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = {};
    productsList.forEach((p) => {
      productMap[p._id] = p;
    });

    const items = (order.items || []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      priceAtPurchase: item.priceAtPurchase,
      name: productMap[item.productId]?.name || 'Product',
    }));

    sendOrderConfirmationEmail(user.email, order.toObject(), items);
    sendPaymentConfirmationEmail(user.email, { ...order.toObject(), razorpayPaymentId: razorpay_payment_id });

    return NextResponse.json({
      orderId: order._id,
      message: 'Payment verified successfully! Order confirmed.',
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Payment verify error:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
