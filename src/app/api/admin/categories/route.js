import { NextResponse } from 'next/server';
import { categorySchema } from '@/lib/validations';
import { routeHandler } from '../../routeHandler';
import { categoryService } from '@/lib/services/categoryService';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const limit = searchParams.get('limit');
    const rawParent = searchParams.get('parentId');
    const cursor = searchParams.get('cursor') || null;

    const result = await categoryService.getAdminCategories({ q, limit, rawParent, cursor });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  },
});

export const POST = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: categorySchema,
  handler: async (request, { data }) => {
    const result = await categoryService.createCategory(data);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result, { status: 201 });
  },
});