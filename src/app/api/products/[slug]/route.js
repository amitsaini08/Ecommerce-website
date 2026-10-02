import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { productService } from '@/lib/services/productService';

export const GET = routeHandler({
  auth: false,
  handler: async (request, { params }) => {
    const { slug } = await params;
    const result = await productService.getProductBySlug(slug);
    return NextResponse.json(result);
  },
});