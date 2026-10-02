import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { productService } from '@/lib/services/productService';

export const GET = routeHandler({
  auth: false,
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sort = searchParams.get('sort') || 'newest';
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minRating = searchParams.get('minRating');
    const inStockOnly = searchParams.get('inStockOnly') === 'true';

    const result = await productService.getPublicProducts({
      page,
      limit,
      sort,
      category,
      search,
      minPrice,
      maxPrice,
      minRating,
      inStockOnly,
    });

    return NextResponse.json(result);
  },
});
