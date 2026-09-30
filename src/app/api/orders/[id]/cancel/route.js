import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase, Order, Product } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { cancelOrderSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';
import { sendOrderStatusEmail } from '@/lib/email';

export async function POST(request, { params }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const rawBody = await request.json().catch(() => ({}));

    const validation = parseAndValidate(cancelOrderSchema, rawBody);
    if (!validation.success) {
      const firstError = validation.errors[0];
      return NextResponse.json(
        {
          error: firstError?.message || 'Reason is required',
          field: firstError?.field,
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const { reason } = validation.sanitizedData;

    await connectToDatabase();
    const order = await Order.findById(id);

    if (!order || (order.userId && order.userId !== user.id)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return NextResponse.json(
        { error: `Cannot cancel order in '${order.status}' status. Only pending or confirmed orders can be cancelled.` },
        { status: 400 }
      );
    }

    order.status = 'cancelled';
    order.cancelReason = reason;

    order.statusHistory.push({
      _id: crypto.randomUUID(),
      status: 'cancelled',
      note: `Cancelled by customer. Reason: ${reason}`,
      changedAt: new Date(),
    });

    await order.save();

    for (const item of order.items || []) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity } }
      );
    }

    sendOrderStatusEmail(user.email, { ...order.toObject(), id: order._id, status: 'cancelled' }, 'cancelled', reason);

    return NextResponse.json({
      message: 'Order cancelled successfully! Stock has been restored.',
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
