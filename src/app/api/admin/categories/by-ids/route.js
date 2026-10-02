import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { categoryService } from '@/lib/services/categoryService';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const ids = (searchParams.get('ids') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const result = await categoryService.getCategoryByIds(ids);
    return NextResponse.json(result);
  },
});