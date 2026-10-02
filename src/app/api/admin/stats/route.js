import { NextResponse } from 'next/server';
import { Order, Product, User } from '@/lib/db/models';
import { routeHandler } from '@/app/api/routeHandler';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async () => {
    const [totalOrders, totalProducts, totalUsers, totalRevenueResult, paidRevenueResult, lowStockProducts] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Product.find({ isActive: true, stock: { $lte: 5 } }).select('_id name stock').limit(10).lean(),
    ]);

    const totalRevenue = totalRevenueResult[0]?.total || 0;
    const paidRevenue = paidRevenueResult[0]?.total || 0;

    return NextResponse.json({ totalOrders, totalProducts, totalUsers, totalRevenue, paidRevenue, lowStockProducts });
  },
});
