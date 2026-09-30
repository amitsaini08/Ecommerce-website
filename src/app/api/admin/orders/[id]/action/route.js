import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase, Order, Product, User } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';
import { adminOrderActionSchema } from '@/lib/validations';
import { sendOrderStatusEmail } from '@/lib/email';

export async function POST(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const result = adminOrderActionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Invalid action data' },
        { status: 400 }
      );
    }

    const { action, status, paymentStatus, reason } = result.data;

    await connectToDatabase();
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let userEmail = order.guestEmail || null;
    if (order.userId) {
      const u = await User.findById(order.userId).lean();
      if (u) userEmail = u.email;
    }

    async function restoreOrderStock() {
      for (const item of order.items || []) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { stock: item.quantity } }
        );
      }
    }

    if (action === 'approve_cancel') {
      order.status = 'cancelled';
      order.statusHistory.push({
        _id: crypto.randomUUID(),
        status: 'cancelled',
        note: `Cancellation approved by admin. ${reason ? `Note: ${reason}` : ''}`,
        changedAt: new Date(),
      });
      await order.save();
      await restoreOrderStock();

      if (userEmail) {
        sendOrderStatusEmail({ email: userEmail }, { ...order.toObject(), id: order._id }, 'cancelled', reason);
      }
      return NextResponse.json({ message: 'Cancellation approved. Stock restored!' });
    }

    if (action === 'reject_cancel') {
      order.statusHistory.push({
        _id: crypto.randomUUID(),
        status: order.status,
        note: `Cancellation request rejected by admin. ${reason ? `Reason: ${reason}` : ''}`,
        changedAt: new Date(),
      });
      await order.save();
      return NextResponse.json({ message: 'Cancellation request rejected.' });
    }

    if (action === 'approve_return') {
      order.returnStatus = 'approved';
      order.paymentStatus = 'refunded';
      order.statusHistory.push({
        _id: crypto.randomUUID(),
        status: order.status,
        note: `Return/Refund approved by admin. Payment status set to refunded. ${reason ? `Note: ${reason}` : ''}`,
        changedAt: new Date(),
      });
      await order.save();
      await restoreOrderStock();

      if (userEmail) {
        sendOrderStatusEmail({ email: userEmail }, { ...order.toObject(), id: order._id }, 'refunded', reason);
      }
      return NextResponse.json({ message: 'Return approved! Payment marked as refunded and stock restored.' });
    }

    if (action === 'reject_return') {
      order.returnStatus = 'rejected';
      order.statusHistory.push({
        _id: crypto.randomUUID(),
        status: order.status,
        note: `Return request rejected by admin. ${reason ? `Reason: ${reason}` : ''}`,
        changedAt: new Date(),
      });
      await order.save();
      return NextResponse.json({ message: 'Return request rejected.' });
    }

    if (action === 'update_status' && status) {
      order.status = status;
      order.statusHistory.push({
        _id: crypto.randomUUID(),
        status,
        note: `Status updated to ${status} by admin. ${reason ? `Note: ${reason}` : ''}`,
        changedAt: new Date(),
      });
      await order.save();

      if (status === 'cancelled') {
        await restoreOrderStock();
      }

      if (userEmail) {
        sendOrderStatusEmail({ email: userEmail }, { ...order.toObject(), id: order._id }, status, reason);
      }
      return NextResponse.json({ message: `Order status updated to ${status}` });
    }

    if (action === 'update_payment_status' && paymentStatus) {
      order.paymentStatus = paymentStatus;
      order.statusHistory.push({
        _id: crypto.randomUUID(),
        status: order.status,
        note: `Payment status updated to ${paymentStatus} by admin.`,
        changedAt: new Date(),
      });
      await order.save();
      return NextResponse.json({ message: `Payment status updated to ${paymentStatus}` });
    }

    return NextResponse.json({ error: 'Invalid action configuration' }, { status: 400 });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Admin order action error:', error);
    return NextResponse.json({ error: 'Failed to execute admin order action' }, { status: 500 });
  }
}
