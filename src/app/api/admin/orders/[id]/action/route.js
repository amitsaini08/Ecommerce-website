import { NextResponse } from 'next/server';
import { Order, Product, User } from '@/lib/db/models';
import { adminOrderActionSchema } from '@/lib/validations';
import { routeHandler, AppError } from '@/app/api/routeHandler';

export const POST = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: adminOrderActionSchema,
  handler: async (request, { params, data }) => {
    const { id } = await params;
    const { action, status, paymentStatus, reason } = data;

    const order = await Order.findById(id);
    if (!order) throw new AppError('Order not found', 404);

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
        status: 'cancelled',
        note: `Cancellation approved by admin. ${reason ? `Note: ${reason}` : ''}`,
        changedAt: new Date(),
      });
      await order.save();
      await restoreOrderStock();
      return NextResponse.json({ message: 'Cancellation approved. Stock restored!' });
    }

    if (action === 'reject_cancel') {
      order.statusHistory.push({
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
        status: order.status,
        note: `Return/Refund approved by admin. ${reason ? `Note: ${reason}` : ''}`,
        changedAt: new Date(),
      });
      await order.save();
      await restoreOrderStock();
      return NextResponse.json({ message: 'Return approved! Payment marked as refunded and stock restored.' });
    }

    if (action === 'reject_return') {
      order.returnStatus = 'rejected';
      order.statusHistory.push({
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
        status,
        note: `Status updated to ${status} by admin. ${reason ? `Note: ${reason}` : ''}`,
        changedAt: new Date(),
      });
      await order.save();

      if (status === 'cancelled') {
        await restoreOrderStock();
      }
      return NextResponse.json({ message: `Order status updated to ${status}` });
    }

    if (action === 'update_payment_status' && paymentStatus) {
      order.paymentStatus = paymentStatus;
      order.statusHistory.push({
        status: order.status,
        note: `Payment status updated to ${paymentStatus} by admin.`,
        changedAt: new Date(),
      });
      await order.save();
      return NextResponse.json({ message: `Payment status updated to ${paymentStatus}` });
    }

    throw new AppError('Invalid action configuration', 400);
  },
});