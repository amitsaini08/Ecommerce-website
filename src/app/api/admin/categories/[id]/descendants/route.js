import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { categoryService } from '@/lib/services/categoryService';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const result = await categoryService.getCategoryDescendantIds(id);
    return NextResponse.json(result);
  },
});