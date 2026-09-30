import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectToDatabase, User, Product } from '@/lib/db/models';

export async function GET(req) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(authUser.id).lean();

    if (!user || !user.wishlist || user.wishlist.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const productsList = await Product.find({ _id: { $in: user.wishlist } }).lean();

    const items = productsList.map((p) => {
      const { productLink, ...rest } = p;
      return {
        ...rest,
        id: p._id,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { productId, productIds } = body;

    await connectToDatabase();

    if (productId) {
      await User.updateOne(
        { _id: authUser.id },
        { $addToSet: { wishlist: productId } }
      );
      return NextResponse.json({ success: true });
    }

    if (Array.isArray(productIds) && productIds.length > 0) {
      const cleanIds = productIds.filter(Boolean);
      await User.updateOne(
        { _id: authUser.id },
        { $addToSet: { wishlist: { $each: cleanIds } } }
      );
      return NextResponse.json({ success: true, count: cleanIds.length });
    }

    return NextResponse.json({ error: 'Missing productId or productIds' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
