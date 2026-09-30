import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase, Order } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { returnOrderSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';

export async function POST(request, { params }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const rawBody = await request.json().catch(() => ({}));

    const validation = parseAndValidate(returnOrderSchema, rawBody);
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

    if (order.status !== 'delivered') {
      return NextResponse.json(
        { error: 'Return request can only be submitted for delivered orders' },
        { status: 400 }
      );
    }

    if (order.returnStatus !== 'none') {
      return NextResponse.json(
        { error: `Return request already submitted (Current status: ${order.returnStatus})` },
        { status: 400 }
      );
    }

    order.returnStatus = 'requested';
    order.returnReason = reason;

    order.statusHistory.push({
      _id: crypto.randomUUID(),
      status: order.status,
      note: `Return/Refund requested by customer. Reason: ${reason}`,
      changedAt: new Date(),
    });

    await order.save();

    return NextResponse.json({
      message: 'Return request submitted successfully! Admin will review your request.',
    });
  } catch (error) {
    console.error('Return order error:', error);
    return NextResponse.json({ error: 'Failed to submit return request' }, { status: 500 });
  }
}
