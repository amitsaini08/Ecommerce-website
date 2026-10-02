import { NextResponse } from 'next/server';
import { Order } from '@/lib/db/models';
import { returnOrderSchema } from '@/lib/validations';
import { routeHandler, AppError } from '@/app/api/routeHandler';
import { sameId } from '@/lib/reviews';

export const POST = routeHandler({
  auth: true,
  rateLimit: { key: 'return-order', max: 3, windowSec: 10 * 60 },
  schema: returnOrderSchema,
  handler: async (request, { user, params, data }) => {
    const { id } = await params;
    const { reason } = data;

    const order = await Order.findById(id);

    if (!order || (order.userId && !sameId(order.userId, user._id) && user.role !== 'admin')) {
      throw new AppError('Order not found', 404);
    }

    if (order.status !== 'delivered') {
      throw new AppError('Return request can only be submitted for delivered orders', 400);
    }

    if (order.returnStatus !== 'none') {
      throw new AppError(`Return request already submitted (Current status: ${order.returnStatus})`, 400);
    }

    order.returnStatus = 'requested';
    order.returnReason = reason;

    order.statusHistory.push({
      status: order.status,
      note: `Return/Refund requested by customer. Reason: ${reason}`,
      changedAt: new Date(),
    });

    await order.save();

    return NextResponse.json({
      message: 'Return request submitted successfully! Admin will review your request.',
    });
  },
});