import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { wishlistService } from '@/lib/services/wishlistService';

export const DELETE = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  handler: async (request, { user, params }) => {
    const { productId } = await params;
    const result = await wishlistService.removeFromWishlist({ user, productId });
    return NextResponse.json(result);
  },
});
