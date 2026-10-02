import { NextResponse } from 'next/server';
import { routeHandler } from '../routeHandler';
import { categoryService } from '@/lib/services/categoryService';

export const GET = routeHandler({
  handler: async () => {
    const result = await categoryService.getPublicCategoriesTree();
    return NextResponse.json(result);
  },
});
