import { NextResponse } from 'next/server';
import { connectToDatabase, Order } from '@/lib/db/models';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    await connectToDatabase();
    const query = { userId: user.id };
    
    const orderList = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const count = await Order.countDocuments(query);

    return NextResponse.json({
      orders: orderList.map((o) => ({ ...o, id: o._id })),
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
