import { NextResponse } from 'next/server';
import { User, Product } from '@/lib/db/models';
import { routeHandler, AppError } from '@/app/api/routeHandler';

export const GET = routeHandler({
  auth: true,
  handler: async (request, { user }) => {
    if (!user || !user.wishlist || user.wishlist.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const productsList = await Product.find({ _id: { $in: user.wishlist } }).lean();
    const items = productsList.map((p) => {
      const { productLink, ...rest } = p;
      return { ...rest, id: String(p._id) };
    });

    return NextResponse.json({ items });
  },
});

export const POST = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  handler: async (request, { user }) => {
    const body = await request.json().catch(() => ({}));
    const { productId, productIds } = body;

    if (productId) {
      await User.updateOne(
        { _id: user._id },
        { $addToSet: { wishlist: String(productId) } }
      );
      return NextResponse.json({ success: true });
    }

    if (Array.isArray(productIds) && productIds.length > 0) {
      const cleanIds = productIds.filter(Boolean).map((id) => String(id));
      await User.updateOne(
        { _id: user._id },
        { $addToSet: { wishlist: { $each: cleanIds } } }
      );
      return NextResponse.json({ success: true, count: cleanIds.length });
    }

    throw new AppError('Missing productId or productIds', 400);
  },
});
