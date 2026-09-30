import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase, Order, Product, User } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';
import { adminOrderActionSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';

export async function GET(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    await connectToDatabase();
    const order = await Order.findById(id).lean();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const productIds = (order.items || []).map((i) => i.productId);
    const productsList = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = {};
    productsList.forEach((p) => {
      productMap[p._id] = p;
    });

    const items = (order.items || []).map((item) => {
      const p = productMap[item.productId];
      return {
        id: item._id,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        productName: p?.name || 'Product',
        productSlug: p?.slug || '',
        productImage: p?.images || [],
        productLink: p?.productLink || null,
      };
    });

    const history = (order.statusHistory || []).map((h) => ({ ...h, id: h._id }));

    let address = order.shippingAddress || null;
    let customer = null;

    if (order.userId) {
      const u = await User.findById(order.userId).lean();
      if (u) {
        customer = { name: u.name, email: u.email, phone: u.phone };
        if (!address && u.addresses) {
          address = u.addresses.find((a) => a._id === order.addressId) || null;
        }
      }
    } else {
      customer = { name: order.guestName, email: order.guestEmail, phone: order.guestPhone };
    }

    return NextResponse.json({
      order: { ...order, id: order._id },
      items,
      history,
      address,
      customer,
    });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const rawBody = await request.json().catch(() => ({}));

    // Support legacy { status, note } as well as adminOrderActionSchema
    const status = rawBody.status ? String(rawBody.status).trim() : null;
    const note = rawBody.note ? String(rawBody.note).trim() : null;
    const action = rawBody.action ? String(rawBody.action).trim() : 'update_status';

    if (!status && !action) {
      return NextResponse.json({ error: 'Status or action required' }, { status: 400 });
    }

    await connectToDatabase();
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (status) {
      order.status = status;
    }

    order.statusHistory.push({
      _id: crypto.randomUUID(),
      status: order.status,
      note: note || `Updated via admin panel (${action})`,
      changedAt: new Date(),
    });

    await order.save();

    return NextResponse.json({ order: { ...order.toObject(), id: order._id } });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
