import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { searchService } from '@/lib/services/searchService';

export const GET = routeHandler({
  auth: false,
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || searchParams.get('search') || '';
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limitParam = parseInt(searchParams.get('limit') || '12');
    const limit = Math.min(Math.max(limitParam, 1), 50);
    const sort = searchParams.get('sort') || 'newest';
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minRating = searchParams.get('minRating');
    const inStockOnly = searchParams.get('inStockOnly') === 'true';

    const result = await searchService.search({
      q,
      page,
      limit,
      sort,
      category,
      minPrice,
      maxPrice,
      minRating,
      inStockOnly,
    });

    return NextResponse.json(result);
  },
});