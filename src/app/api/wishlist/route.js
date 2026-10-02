import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { wishlistService } from '@/lib/services/wishlistService';

export const GET = routeHandler({
  auth: true,
  handler: async (request, { user }) => {
    const result = await wishlistService.getWishlist(user);
    return NextResponse.json(result);
  },
});

export const POST = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  handler: async (request, { user }) => {
    const body = await request.json().catch(() => ({}));
    const { productId, productIds } = body;
    const result = await wishlistService.addToWishlist({ user, productId, productIds });
    return NextResponse.json(result);
  },
});
