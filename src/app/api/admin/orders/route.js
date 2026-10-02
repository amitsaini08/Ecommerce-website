import { NextResponse } from 'next/server';
import { connectToDatabase, Order, User } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';
import { routeHandler } from '../../routeHandler';


export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const paymentMethod = searchParams.get('paymentMethod');
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const offset = (page - 1) * limit;

  

  
    const baseMatch = {};

    if (status === 'payment_pending') { baseMatch.paymentStatus = 'pending'; }
    else if (status) { baseMatch.status = status }
    if (paymentStatus) { baseMatch.paymentStatus = paymentStatus }
    if (paymentMethod) { baseMatch.paymentMethod = paymentMethod; }

    if (dateFrom || dateTo) {
      baseMatch.createdAt = {};
      if (dateFrom) baseMatch.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        baseMatch.createdAt.$lte = end;
      }
    }

    if (minAmount || maxAmount) {
      baseMatch.totalAmount = {};
      if (minAmount) baseMatch.totalAmount.$gte = parseFloat(minAmount);
      if (maxAmount) baseMatch.totalAmount.$lte = parseFloat(maxAmount);
    }

    const pipeline = [
      { $match: baseMatch },
      {
        $lookup: {
          from: User.collection.name,
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          effectiveName: { $ifNull: ['$user.name', '$guestName'] },
          effectiveEmail: { $ifNull: ['$user.email', '$guestEmail'] },
          effectivePhone: { $ifNull: ['$user.phone', '$guestPhone'] },
          idString: { $toString: '$_id' },
        },
      },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { idString: { $regex: search, $options: 'i' } },
            { effectiveName: { $regex: search, $options: 'i' } },
            { effectiveEmail: { $regex: search, $options: 'i' } },
            { effectivePhone: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: offset },
          { $limit: limit },
        ],
        totalCount: [{ $count: 'count' }],
      },
    });

    const [result] = await Order.aggregate(pipeline);
    const list = result?.data || [];
    const count = result?.totalCount?.[0]?.count || 0;

    const ordersFormatted = list.map((o) => ({
      _id: o._id,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      couponCode: o.couponCode,
      userName: o.effectiveName || 'Guest Customer',
      userEmail: o.effectiveEmail || '',
      userPhone: o.effectivePhone || '',
    }));

    return NextResponse.json({
      orders: ordersFormatted,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  },
})