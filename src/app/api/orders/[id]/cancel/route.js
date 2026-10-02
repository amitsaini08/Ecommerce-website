import { NextResponse } from 'next/server';
import { Order, Product } from '@/lib/db/models';
import { cancelOrderSchema } from '@/lib/validations';
import { routeHandler, AppError } from '@/app/api/routeHandler';
import { sameId } from '@/lib/reviews';

export const POST = routeHandler({
  auth: true,
  rateLimit: { key: 'cancel-order', max: 3, windowSec: 10 * 60 },
  schema: cancelOrderSchema,
  handler: async (request, { user, params, data }) => {
    const { id } = await params;
    const { reason } = data;

    const order = await Order.findById(id);

    if (!order || (order.userId && !sameId(order.userId, user._id) && user.role !== 'admin')) {
      throw new AppError('Order not found', 404);
    }

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      throw new AppError(`Cannot cancel order in '${order.status}' status.`, 400);
    }

    order.status = 'cancelled';
    order.cancelReason = reason;
    order.statusHistory.push({
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

    return NextResponse.json({
      message: 'Order cancelled successfully! Stock has been restored.',
    });
  },
});