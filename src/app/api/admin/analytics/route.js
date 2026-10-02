import { NextResponse } from 'next/server';
import { routeHandler } from '../../routeHandler';
import { adminStatsService } from '@/lib/services/adminStatsService';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async () => {
    const result = await adminStatsService.getAnalytics();
    return NextResponse.json(result);
  },
});