import { NextResponse } from 'next/server';
import { Order, Product, User } from '@/lib/db/models';
import { adminOrderActionSchema } from '@/lib/validations';
import { routeHandler, AppError } from '@/app/api/routeHandler';
import { sameId } from '@/lib/reviews';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const order = await Order.findById(id).lean();
    if (!order) throw new AppError('Order not found', 404);

    const productIds = (order.items || []).map((i) => i.productId);
    const productsList = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(productsList.map((p) => [String(p._id), p]));

    const items = (order.items || []).map((item) => {
      const p = productMap.get(String(item.productId));
      return {
        _id: String(item._id),
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        productName: p?.name || 'Product',
        productSlug: p?.slug || '',
        productImage: p?.images || [],
        productLink: p?.productLink || null,
      };
    });

    const history = order.statusHistory || [];
    let address = order.shippingAddress || null;
    let customer = null;

    if (order.userId) {
      const u = await User.findById(order.userId).lean();
      if (u) {
        customer = { name: u.name, email: u.email, phone: u.phone };
        if (!address && u.addresses) {
          address = u.addresses.find((a) => sameId(a._id, order.addressId)) || null;
        }
      }
    } else {
      customer = { name: order.guestName, email: order.guestEmail, phone: order.guestPhone };
    }

    return NextResponse.json({
      order,
      items,
      history,
      address,
      customer,
    });
  },
});

export const PATCH = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: adminOrderActionSchema,
  handler: async (request, { params, data }) => {
    const { id } = await params;
    const { status, reason, paymentStatus, action } = data;

    const order = await Order.findById(id);
    if (!order) throw new AppError('Order not found', 404);

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    order.statusHistory.push({
      status: order.status,
      note: reason || `Updated via admin panel (${action})`,
      changedAt: new Date(),
    });

    await order.save();
    return NextResponse.json({ order: order.toObject() });
  },
});