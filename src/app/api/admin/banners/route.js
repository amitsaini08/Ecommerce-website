import { NextResponse } from 'next/server';
import { bannerSchema } from '@/lib/validations';
import { routeHandler } from '@/app/api/routeHandler';
import { bannerService } from '@/lib/services/bannerService';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async () => {
    const result = await bannerService.getAdminBanners();
    return NextResponse.json(result);
  },
});

export const POST = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: bannerSchema,
  handler: async (request, { data }) => {
    const result = await bannerService.createBanner(data);
    return NextResponse.json(result, { status: 201 });
  },
});