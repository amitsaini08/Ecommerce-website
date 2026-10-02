import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { adminStatsService } from '@/lib/services/adminStatsService';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async () => {
    const result = await adminStatsService.getDashboardStats();
    return NextResponse.json(result);
  },
});
