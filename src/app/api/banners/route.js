import { NextResponse } from 'next/server';
import { routeHandler } from '../routeHandler';
import { bannerService } from '@/lib/services/bannerService';

export const GET = routeHandler({
  auth: false,
  handler: async () => {
    const result = await bannerService.getActiveBanners();
    return NextResponse.json(result);
  },
});