import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { bannerSchema } from '@/lib/validations';
import { bannerService } from '@/lib/services/bannerService';

export const PUT = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: bannerSchema,
  handler: async (request, { params, data }) => {
    const { id } = await params;
    const result = await bannerService.updateBanner({ id, data });
    return NextResponse.json(result);
  },
});

export const DELETE = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const result = await bannerService.deleteBanner(id);
    return NextResponse.json(result);
  },
});