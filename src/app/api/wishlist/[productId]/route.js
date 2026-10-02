import { NextResponse } from 'next/server';
import { User } from '@/lib/db/models';
import { routeHandler } from '@/app/api/routeHandler';

export const DELETE = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  handler: async (request, { user, params }) => {
    const { productId } = await params;
    await User.updateOne(
      { _id: user._id },
      { $pull: { wishlist: String(productId) } }
    );

    return NextResponse.json({ success: true });
  },
});
