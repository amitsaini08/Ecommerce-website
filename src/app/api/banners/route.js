import { NextResponse } from 'next/server';
import { Banner } from '@/lib/db/models';
import { routeHandler } from '../routeHandler';


export const GET = routeHandler({
  auth: false,
  handler: async (request) => {
    const activeBanners = await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean();
    return NextResponse.json({ banners: activeBanners });
  }
})