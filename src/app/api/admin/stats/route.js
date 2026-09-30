import { NextResponse } from 'next/server';
import { connectToDatabase, Order, Product, User } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAdmin(request);
    await connectToDatabase();

    const [
      totalOrders,
      totalProducts,
      totalUsers,
      totalRevenueResult,
      paidRevenueResult,
      lowStockProducts,
    ] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments(),
      Order.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Product.find({ isActive: true, stock: { $lte: 5 } })
        .select('_id name stock')
        .limit(10)
        .lean(),
    ]);

    const totalRevenue = totalRevenueResult[0]?.total || 0;
    const paidRevenue = paidRevenueResult[0]?.total || 0;

    return NextResponse.json({
      totalOrders,
      totalProducts,
      totalUsers,
      totalRevenue,
      paidRevenue,
      lowStockProducts: lowStockProducts.map((p) => ({ ...p, id: p._id })),
    });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
