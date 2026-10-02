import { NextResponse } from 'next/server';
import { Order, Product, User } from '@/lib/db/models';
import { routeHandler, AppError } from '@/app/api/routeHandler';
import { sameId } from '@/lib/reviews';

export const GET = routeHandler({
  auth: true,
  handler: async (request, { user, params }) => {
    const { id } = await params;
    const order = await Order.findById(id).lean();

    if (!order) throw new AppError('Order not found', 404);

    if (order.userId && !sameId(user._id, order.userId) && user.role !== 'admin') {
      throw new AppError('Order not found', 404);
    }

    const productIds = (order.items || []).map((i) => i.productId);
    const productsList = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(productsList.map((p) => [String(p._id), p]));

    const items = (order.items || []).map((item) => {
      const prod = productMap.get(String(item.productId));
      return {
        _id: String(item._id),
        productId: String(item.productId),
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        addons: item.addons || [],
        productName: prod?.name || 'Product',
        productSlug: prod?.slug || '',
        productImage: prod?.images || [],
      };
    });

    let address = order.shippingAddress || null;
    if (!address && order.addressId && order.userId) {
      const dbUser = await User.findById(order.userId).lean();
      if (dbUser && dbUser.addresses) {
        address = dbUser.addresses.find((a) => sameId(a._id, order.addressId)) || null;
      }
    }

    return NextResponse.json({
      order: { ...order, id: String(order._id) },
      items,
      history: order.statusHistory || [],
      trackingEvents: order.shipmentTrackingEvents || [],
      address,
    });
  },
});