import { NextResponse } from 'next/server';
import { routeHandler } from '../../routeHandler';
import { categoryService } from '@/lib/services/categoryService';

export const GET = routeHandler({
  handler: async (request, { params }) => {
    const { slug } = await params;
    const result = await categoryService.getCategoryBySlug(slug);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  },
});
