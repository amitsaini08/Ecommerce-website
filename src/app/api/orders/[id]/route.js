import { NextResponse } from 'next/server';
import { connectToDatabase, Order, Product, User } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;

    await connectToDatabase();
    const order = await Order.findById(id).lean();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Allow owner or admin or guest with valid session
    if (order.userId) {
      if (!authUser || (authUser.id !== order.userId && authUser.role !== 'admin')) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
    }

    // Populate product details for items
    const productIds = (order.items || []).map((i) => i.productId);
    const productsList = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = {};
    productsList.forEach((p) => {
      productMap[p._id] = p;
    });

    const items = (order.items || []).map((item) => {
      const prod = productMap[item.productId];
      return {
        id: item._id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        addons: item.addons || [],
        productName: prod?.name || 'Product',
        productSlug: prod?.slug || '',
        productImage: prod?.images || [],
      };
    });

    // Get user address if addressId is set and no direct shippingAddress snapshot exists
    let address = order.shippingAddress || null;
    if (!address && order.addressId && order.userId) {
      const dbUser = await User.findById(order.userId).lean();
      if (dbUser && dbUser.addresses) {
        address = dbUser.addresses.find((a) => a._id === order.addressId) || null;
      }
    }

    return NextResponse.json({
      order: { ...order, id: order._id },
      items,
      history: (order.statusHistory || []).map((h) => ({ ...h, id: h._id })),
      trackingEvents: (order.shipmentTrackingEvents || []).map((t) => ({ ...t, id: t._id })),
      address,
    });
  } catch (error) {
    console.error('Fetch order detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
