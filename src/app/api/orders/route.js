import { NextResponse } from 'next/server';
import { Order } from '@/lib/db/models';
import { routeHandler } from '@/app/api/routeHandler';

export const GET = routeHandler({
  auth: true,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const query = { $or: [{ userId: String(user._id) }, { userId: user._id }] };
    const orderList = await Order.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
    const count = await Order.countDocuments(query);

    return NextResponse.json({
      orders: orderList,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  },
});